import "server-only";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, type DbTx } from "@/db";
import {
  bonusTransactions,
  ledgerEntries,
  orders,
  paymentTransactions,
  products,
  profiles,
  referralCommissions,
  referrals,
  userBalances,
  withdrawals,
} from "@/db/schema";
import { DEMO_MODE, REFERRAL_RATES } from "@/lib/config";
import { generatePaymentReference, getPaymentProvider } from "./payment";
import { audit, getDemoDayOffset, notify, getMinWithdrawal, getWithdrawalFeePercent } from "./system";

/* ------------------------------------------------------------------ */
/* Erreurs métier (code = clé i18n)                                    */
/* ------------------------------------------------------------------ */
export class FinanceError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const DAY_MS = 24 * 3600 * 1000;

/** "Maintenant" effectif : en mode démo, un décalage de jours peut être simulé. */
export async function effectiveNow(): Promise<Date> {
  const offset = DEMO_MODE ? await getDemoDayOffset() : 0;
  return new Date(Date.now() + offset * DAY_MS);
}

/* ------------------------------------------------------------------ */
/* Journal immuable + solde (unique point de mutation des soldes)      */
/* ------------------------------------------------------------------ */
type LedgerType = (typeof ledgerEntries.$inferInsert)["type"];
type CounterKey = "totalInvested" | "totalBonus" | "totalCommission" | "totalWithdrawn" | "pendingWithdrawal";

export type LedgerInput = {
  userId: string;
  type: LedgerType;
  amount: number; // toujours positif
  effect: "credit" | "debit" | "none";
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  counters?: Partial<Record<CounterKey, number>>; // deltas
};

/**
 * Applique une écriture financière de manière atomique et idempotente.
 * - verrouille la ligne de solde (FOR UPDATE)
 * - refuse un solde négatif
 * - insère l'écriture (clé d'idempotence UNIQUE → jamais deux fois)
 * Retourne false si l'opération avait déjà été appliquée.
 */
export async function applyLedger(tx: DbTx, input: LedgerInput): Promise<boolean> {
  if (!Number.isInteger(input.amount) || input.amount < 0) {
    throw new FinanceError("withdraw.err.invalidAmount");
  }
  await tx.insert(userBalances).values({ userId: input.userId }).onConflictDoNothing();
  const [bal] = await tx
    .select()
    .from(userBalances)
    .where(eq(userBalances.userId, input.userId))
    .for("update");

  const before = bal.available;
  let after = before;
  if (input.effect === "credit") after = before + input.amount;
  if (input.effect === "debit") after = before - input.amount;
  if (after < 0) throw new FinanceError("withdraw.err.insufficient");

  const inserted = await tx
    .insert(ledgerEntries)
    .values({
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceBefore: before,
      balanceAfter: after,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      idempotencyKey: input.idempotencyKey,
      description: input.description ?? null,
    })
    .onConflictDoNothing({ target: ledgerEntries.idempotencyKey })
    .returning({ id: ledgerEntries.id });
  if (inserted.length === 0) return false; // déjà appliqué

  const c = input.counters ?? {};
  await tx
    .update(userBalances)
    .set({
      available: after,
      totalInvested: bal.totalInvested + (c.totalInvested ?? 0),
      totalBonus: bal.totalBonus + (c.totalBonus ?? 0),
      totalCommission: bal.totalCommission + (c.totalCommission ?? 0),
      totalWithdrawn: bal.totalWithdrawn + (c.totalWithdrawn ?? 0),
      pendingWithdrawal: bal.pendingWithdrawal + (c.pendingWithdrawal ?? 0),
      updatedAt: new Date(),
    })
    .where(eq(userBalances.userId, input.userId));
  return true;
}

/* ------------------------------------------------------------------ */
/* Parrainage : chaîne à 3 niveaux, créée uniquement à l'inscription    */
/* ------------------------------------------------------------------ */
export async function getAncestors(ex: DbTx | typeof db, userId: string, maxLevel = 3) {
  const chain: { id: string; level: number; status: string; firstName: string }[] = [];
  let current = userId;
  for (let level = 1; level <= maxLevel; level++) {
    const [row] = await ex
      .select({ referredBy: profiles.referredBy })
      .from(profiles)
      .where(eq(profiles.id, current))
      .limit(1);
    if (!row?.referredBy) break;
    const [sponsor] = await ex
      .select({ id: profiles.id, status: profiles.status, firstName: profiles.firstName })
      .from(profiles)
      .where(eq(profiles.id, row.referredBy))
      .limit(1);
    if (!sponsor || sponsor.id === userId || chain.some((c) => c.id === sponsor.id)) break; // anti-boucle
    chain.push({ ...sponsor, level });
    current = sponsor.id;
  }
  return chain;
}

export async function createReferralChain(tx: DbTx, newUserId: string, newUserName: string): Promise<void> {
  const ancestors = await getAncestors(tx, newUserId, 3);
  for (const a of ancestors) {
    await tx
      .insert(referrals)
      .values({ referrerId: a.id, referredId: newUserId, level: a.level })
      .onConflictDoNothing();
    await notify(tx, {
      userId: a.id,
      type: "new_referral",
      title: "Nouveau filleul",
      body: `${newUserName} a rejoint votre équipe (niveau ${a.level}).`,
      data: { name: newUserName, level: a.level, userId: newUserId },
    });
  }
}

/* ------------------------------------------------------------------ */
/* Achat : commande + transaction de paiement en attente                */
/* ------------------------------------------------------------------ */
export async function createOrderWithPayment(userId: string, productId: string, phone?: string) {
  const provider = getPaymentProvider();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || !product.isActive) throw new FinanceError("products.notFound");

  const reference = generatePaymentReference();
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        productId: product.id,
        productName: product.name,
        price: product.price,
        dailyBonus: product.dailyBonus,
        durationDays: product.durationDays,
        status: "pending",
      })
      .returning();
    const [payment] = await tx
      .insert(paymentTransactions)
      .values({
        reference,
        userId,
        orderId: order.id,
        productId: product.id,
        amount: product.price,
        currency: "XOF",
        method: provider.isDemo ? "demo" : "wave",
        provider: provider.name,
        status: "pending",
        isDemo: provider.isDemo,
      })
      .returning();
    return { order, payment };
  });

  const init = await provider.initiate({
    reference,
    amount: product.price,
    currency: "XOF",
    userId,
    phone,
    description: product.name,
  });
  if (init.providerReference) {
    await db
      .update(paymentTransactions)
      .set({ providerReference: init.providerReference, updatedAt: new Date() })
      .where(eq(paymentTransactions.id, result.payment.id));
  }
  return { payment: result.payment, order: result.order, checkoutUrl: init.checkoutUrl };
}

/* ------------------------------------------------------------------ */
/* Confirmation serveur d'un paiement (idempotente)                    */
/* ------------------------------------------------------------------ */
export async function confirmPayment(
  reference: string,
  opts: { providerReference?: string; source: "webhook" | "demo" | "verify" | "admin"; actorId?: string },
): Promise<{ status: "confirmed" | "already_processed" }> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.reference, reference))
      .for("update");
    if (!payment) throw new FinanceError("checkout.notFound");
    if (payment.status === "paid") return { status: "already_processed" as const };
    if (payment.status !== "pending") throw new FinanceError("common.error", "Payment not pending");
    if (opts.source === "demo" && !payment.isDemo) {
      throw new FinanceError("common.unauthorized", "Demo confirmation on real payment");
    }

    const now = new Date();
    await tx
      .update(paymentTransactions)
      .set({
        status: "paid",
        paidAt: now,
        providerReference: opts.providerReference ?? payment.providerReference,
        metadata: { ...(payment.metadata ?? {}), confirmedBy: opts.source },
        updatedAt: now,
      })
      .where(and(eq(paymentTransactions.id, payment.id), eq(paymentTransactions.status, "pending")));

    const [order] = await tx.select().from(orders).where(eq(orders.id, payment.orderId)).for("update");
    const startedAt = await effectiveNow();
    const endsAt = new Date(startedAt.getTime() + order.durationDays * DAY_MS);
    await tx
      .update(orders)
      .set({ status: "active", startedAt, endsAt, updatedAt: now })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")));

    await applyLedger(tx, {
      userId: payment.userId,
      type: "investment",
      amount: payment.amount,
      effect: "none",
      idempotencyKey: `investment:${payment.id}`,
      referenceType: "payment",
      referenceId: payment.id,
      description: order.productName,
      counters: { totalInvested: payment.amount },
    });

    await notify(tx, {
      userId: payment.userId,
      type: "payment_received",
      title: "Paiement reçu",
      body: `Paiement de ${payment.amount} FCFA reçu (réf. ${payment.reference}).`,
      data: { amount: payment.amount, reference: payment.reference },
    });
    await notify(tx, {
      userId: payment.userId,
      type: "purchase_confirmed",
      title: "Achat confirmé",
      body: `Votre produit ${order.productName} est actif pour ${order.durationDays} jours.`,
      data: { product: order.productName, days: order.durationDays, orderId: order.id },
    });

    // Bonus jour 1 crédité immédiatement à la confirmation du paiement.
    const firstBonusDate = new Date(startedAt.getTime() + 1 * DAY_MS).toISOString().slice(0, 10);
    const insertedFirstBonus = await tx
      .insert(bonusTransactions)
      .values({ userId: order.userId, orderId: order.id, amount: order.dailyBonus, bonusDate: firstBonusDate, dayNumber: 1 })
      .onConflictDoNothing()
      .returning({ id: bonusTransactions.id });
    if (insertedFirstBonus.length > 0) {
      await applyLedger(tx, {
        userId: order.userId,
        type: "bonus",
        amount: order.dailyBonus,
        effect: "credit",
        idempotencyKey: `bonus:${order.id}:1`,
        referenceType: "bonus",
        referenceId: insertedFirstBonus[0].id,
        description: `${order.productName} — jour 1/${order.durationDays}`,
        counters: { totalBonus: order.dailyBonus },
      });
      await tx
        .update(orders)
        .set({
          bonusDaysPaid: sql`GREATEST(${orders.bonusDaysPaid}, 1)`,
          totalBonusPaid: sql`${orders.totalBonusPaid} + ${order.dailyBonus}`,
          updatedAt: now,
        })
        .where(eq(orders.id, order.id));
      await notify(tx, {
        userId: order.userId,
        type: "bonus_credited",
        title: "Bonus reçu",
        body: `Vous avez reçu ${order.dailyBonus} FCFA de bonus pour ${order.productName}.`,
        data: { amount: order.dailyBonus, orderId: order.id, day: 1 },
      });
    }

    await distributeCommissions(tx, payment, order);
    if (opts.source === "admin" && opts.actorId) {
      await audit(tx, {
        adminId: opts.actorId,
        action: "payment.confirm",
        entityType: "payment",
        entityId: payment.id,
        oldValue: { status: "pending" },
        newValue: { status: "paid" },
      });
    }
    return { status: "confirmed" as const };
  });
}

async function distributeCommissions(
  tx: DbTx,
  payment: typeof paymentTransactions.$inferSelect,
  order: typeof orders.$inferSelect,
) {
  const [buyer] = await tx
    .select({ firstName: profiles.firstName, lastName: profiles.lastName })
    .from(profiles)
    .where(eq(profiles.id, payment.userId))
    .limit(1);
  const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName.charAt(0)}.` : "—";
  const ancestors = await getAncestors(tx, payment.userId, 3);
  for (const a of ancestors) {
    if (a.status !== "active") continue;
    const rate = REFERRAL_RATES[a.level as 1 | 2 | 3];
    const amount = Math.floor((payment.amount * rate) / 100);
    if (amount <= 0) continue;
    const inserted = await tx
      .insert(referralCommissions)
      .values({
        beneficiaryId: a.id,
        sourceUserId: payment.userId,
        orderId: order.id,
        paymentId: payment.id,
        level: a.level,
        ratePercent: rate,
        baseAmount: payment.amount,
        amount,
      })
      .onConflictDoNothing()
      .returning({ id: referralCommissions.id });
    if (inserted.length === 0) continue; // déjà versée
    const applied = await applyLedger(tx, {
      userId: a.id,
      type: "commission",
      amount,
      effect: "credit",
      idempotencyKey: `commission:${payment.id}:${a.id}`,
      referenceType: "commission",
      referenceId: inserted[0].id,
      description: `Niveau ${a.level} — ${buyerName}`,
      counters: { totalCommission: amount },
    });
    if (applied) {
      await notify(tx, {
        userId: a.id,
        type: "commission_received",
        title: "Commission reçue",
        body: `${amount} FCFA de commission (niveau ${a.level}) grâce à ${buyerName}.`,
        data: { amount, level: a.level, name: buyerName },
      });
    }
  }
}

export async function failPayment(reference: string, opts: { providerReference?: string; reason?: string }) {
  await db
    .update(paymentTransactions)
    .set({
      status: "failed",
      providerReference: opts.providerReference,
      metadata: { reason: opts.reason ?? "provider_failed" },
      updatedAt: new Date(),
    })
    .where(and(eq(paymentTransactions.reference, reference), eq(paymentTransactions.status, "pending")));
}

export async function cancelPayment(userId: string, paymentId: string) {
  await db.transaction(async (tx) => {
    const [p] = await tx
      .update(paymentTransactions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(paymentTransactions.id, paymentId),
          eq(paymentTransactions.userId, userId),
          eq(paymentTransactions.status, "pending"),
        ),
      )
      .returning({ orderId: paymentTransactions.orderId });
    if (p) {
      await tx
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(orders.id, p.orderId), eq(orders.status, "pending")));
    }
  });
}

/* ------------------------------------------------------------------ */
/* Bonus quotidiens (serveur uniquement, anti double-crédit)            */
/* ------------------------------------------------------------------ */
export async function accrueBonuses(opts: { userId?: string; limit?: number } = {}) {
  const now = await effectiveNow();
  const conditions = [eq(orders.status, "active"), isNotNull(orders.startedAt)];
  if (opts.userId) conditions.push(eq(orders.userId, opts.userId));
  const active = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(asc(orders.startedAt))
    .limit(opts.limit ?? 500);

  let processed = 0;
  let credits = 0;
  for (const order of active) {
    if (!order.startedAt) continue;
    const elapsed = Math.floor((now.getTime() - order.startedAt.getTime()) / DAY_MS);
    const target = Math.min(elapsed, order.durationDays);
    let creditedAmount = 0;
    let lastDay = order.bonusDaysPaid;
    for (let day = order.bonusDaysPaid + 1; day <= target; day++) {
      const credited = await db.transaction(async (tx) => {
        const bonusDate = new Date(order.startedAt!.getTime() + day * DAY_MS).toISOString().slice(0, 10);
        const inserted = await tx
          .insert(bonusTransactions)
          .values({ userId: order.userId, orderId: order.id, amount: order.dailyBonus, bonusDate, dayNumber: day })
          .onConflictDoNothing()
          .returning({ id: bonusTransactions.id });
        if (inserted.length === 0) return false;
        await applyLedger(tx, {
          userId: order.userId,
          type: "bonus",
          amount: order.dailyBonus,
          effect: "credit",
          idempotencyKey: `bonus:${order.id}:${day}`,
          referenceType: "bonus",
          referenceId: inserted[0].id,
          description: `${order.productName} — jour ${day}/${order.durationDays}`,
          counters: { totalBonus: order.dailyBonus },
        });
        await tx
          .update(orders)
          .set({
            bonusDaysPaid: sql`GREATEST(${orders.bonusDaysPaid}, ${day})`,
            totalBonusPaid: sql`${orders.totalBonusPaid} + ${order.dailyBonus}`,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
        return true;
      });
      if (credited) {
        creditedAmount += order.dailyBonus;
        credits++;
      }
      lastDay = day;
    }
    if (creditedAmount > 0) {
      await notify(db, {
        userId: order.userId,
        type: "bonus_credited",
        title: "Bonus crédité",
        body: `${creditedAmount} FCFA crédité(s) pour ${order.productName}.`,
        data: { amount: creditedAmount, product: order.productName, orderId: order.id },
      });
    }
    if (lastDay >= order.durationDays) {
      await db
        .update(orders)
        .set({ status: "completed", updatedAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, "active")));
    }
    processed++;
  }
  return { processed, credits };
}

/* ------------------------------------------------------------------ */
/* Retraits                                                            */
/* ------------------------------------------------------------------ */
type WithdrawalMethod = (typeof withdrawals.$inferInsert)["method"];

export async function requestWithdrawal(
  userId: string,
  input: { amount: number; method: WithdrawalMethod; phone: string },
) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new FinanceError("withdraw.err.invalidAmount");
  const minWithdrawal = await getMinWithdrawal();
  if (input.amount < minWithdrawal) throw new FinanceError("withdraw.err.min");
  const feePercent = await getWithdrawalFeePercent();
  const feeAmount = Math.floor((input.amount * feePercent) / 100);
  const netAmount = input.amount - feeAmount;
  return db.transaction(async (tx) => {
    const [w] = await tx
      .insert(withdrawals)
      .values({ userId, amount: input.amount, feePercent, feeAmount, netAmount, method: input.method, phone: input.phone, isDemo: DEMO_MODE })
      .returning();
    await applyLedger(tx, {
      userId,
      type: "withdrawal_hold",
      amount: input.amount,
      effect: "debit",
      idempotencyKey: `withdrawal_hold:${w.id}`,
      referenceType: "withdrawal",
      referenceId: w.id,
      description: `${input.method} ${input.phone}`,
      counters: { pendingWithdrawal: input.amount },
    });
    await notify(tx, {
      userId,
      type: "withdrawal_requested",
      title: "Retrait demandé",
      body: `Votre demande de ${input.amount} FCFA est en attente. Après ${feePercent}% de frais, vous recevrez ${netAmount} FCFA.`,
      data: { amount: input.amount, feeAmount, netAmount, withdrawalId: w.id },
    });
    return w;
  });
}
export async function approveWithdrawal(adminId: string, id: string, note?: string) {
  return db.transaction(async (tx) => {
    const [w] = await tx
      .update(withdrawals)
      .set({ status: "approved", adminNote: note ?? null, processedBy: adminId, processedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(withdrawals.id, id), eq(withdrawals.status, "pending")))
      .returning();
    if (!w) throw new FinanceError("common.error", "Withdrawal not pending");
    await audit(tx, {
      adminId,
      action: "withdrawal.approve",
      entityType: "withdrawal",
      entityId: id,
      oldValue: { status: "pending" },
      newValue: { status: "approved", note: note ?? null },
    });
    await notify(tx, {
      userId: w.userId,
      type: "withdrawal_approved",
      title: "Retrait approuvé",
      body: `Votre retrait de ${w.amount} FCFA a été approuvé et sera traité.`,
      data: { amount: w.amount, withdrawalId: w.id },
    });
    return w;
  });
}

export async function rejectWithdrawal(adminId: string, id: string, note?: string) {
  return db.transaction(async (tx) => {
    const [w] = await tx
      .update(withdrawals)
      .set({ status: "rejected", adminNote: note ?? null, processedBy: adminId, processedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(withdrawals.id, id), inArray(withdrawals.status, ["pending", "approved"])))
      .returning();
    if (!w) throw new FinanceError("common.error", "Withdrawal not rejectable");
    await applyLedger(tx, {
      userId: w.userId,
      type: "withdrawal_refund",
      amount: w.amount,
      effect: "credit",
      idempotencyKey: `withdrawal_refund:${w.id}`,
      referenceType: "withdrawal",
      referenceId: w.id,
      description: note || undefined,
      counters: { pendingWithdrawal: -w.amount },
    });
    await audit(tx, {
      adminId,
      action: "withdrawal.reject",
      entityType: "withdrawal",
      entityId: id,
      oldValue: { status: "pending" },
      newValue: { status: "rejected", note: note ?? null },
    });
    await notify(tx, {
      userId: w.userId,
      type: "withdrawal_rejected",
      title: "Retrait rejeté",
      body: `Votre retrait de ${w.amount} FCFA a été rejeté. Le montant a été restitué.`,
      data: { amount: w.amount, note: note ?? "", withdrawalId: w.id },
    });
    return w;
  });
}

export async function completeWithdrawal(adminId: string, id: string) {
  const provider = getPaymentProvider();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(withdrawals).where(eq(withdrawals.id, id)).for("update");
    if (!current || current.status !== "approved") throw new FinanceError("common.error", "Withdrawal not approved");
    // En mode réel, le virement est déclenché ici via l'API du prestataire (à activer).
    let providerReference: string | null = null;
    if (provider.isDemo) {
      providerReference = (await provider.payout({
        withdrawalId: id,
        amount: current.netAmount,
        currency: "XOF",
        phone: current.phone,
        method: current.method,
      })).providerReference;
    } else {
      providerReference = `MANUAL-${id.slice(0, 8).toUpperCase()}`;
    }
    const [w] = await tx
      .update(withdrawals)
      .set({ status: "completed", processedBy: adminId, processedAt: new Date(), providerReference, updatedAt: new Date() })
      .where(and(eq(withdrawals.id, id), eq(withdrawals.status, "approved")))
      .returning();
    await applyLedger(tx, {
      userId: w.userId,
      type: "withdrawal_paid",
      amount: w.netAmount,
      effect: "none",
      idempotencyKey: `withdrawal_paid:${w.id}`,
      referenceType: "withdrawal",
      referenceId: w.id,
      description: `${w.method} ${w.phone}`,
      counters: { pendingWithdrawal: -w.amount, totalWithdrawn: w.netAmount },
    });
    await audit(tx, {
      adminId,
      action: "withdrawal.complete",
      entityType: "withdrawal",
      entityId: id,
      oldValue: { status: "approved" },
      newValue: { status: "completed", providerReference },
    });
    await notify(tx, {
      userId: w.userId,
      type: "withdrawal_completed",
      title: "Retrait effectué",
      body: `Votre retrait de ${w.amount} FCFA a été effectué vers ${w.phone}.`,
      data: { amount: w.amount, phone: w.phone, withdrawalId: w.id },
    });
    return w;
  });
}
