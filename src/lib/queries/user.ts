import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ledgerEntries,
  notifications,
  orders,
  paymentTransactions,
  products,
  profiles,
  referralCommissions,
  referrals,
  userBalances,
  withdrawals,
} from "@/db/schema";
import { PAGE_SIZE } from "@/lib/config";

export function pageOf(searchPage: string | string[] | undefined): number {
  const n = Number(Array.isArray(searchPage) ? searchPage[0] : searchPage);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export type Paged<T> = { rows: T[]; page: number; totalPages: number; total: number };

function paged<T>(rows: T[], total: number, page: number): Paged<T> {
  return { rows, page, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/* ------------------------------ Solde ------------------------------ */
export async function getBalance(userId: string) {
  const [b] = await db.select().from(userBalances).where(eq(userBalances.userId, userId)).limit(1);
  return (
    b ?? {
      userId,
      available: 0,
      totalInvested: 0,
      totalBonus: 0,
      totalCommission: 0,
      totalWithdrawn: 0,
      pendingWithdrawal: 0,
      updatedAt: new Date(),
    }
  );
}

/* ------------------------------ Tableau de bord ------------------------------ */
export async function getDashboardData(userId: string) {
  const [balance, activeOrders, recentLedger, [unread], [team]] = await Promise.all([
    getBalance(userId),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, "active")))
      .orderBy(desc(orders.createdAt))
      .limit(10),
    db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.userId, userId))
      .orderBy(desc(ledgerEntries.createdAt))
      .limit(6),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(referrals)
      .where(and(eq(referrals.referrerId, userId), eq(referrals.level, 1))),
  ]);
  const dailyIncome = activeOrders.reduce((s, o) => s + o.dailyBonus, 0);
  return { balance, activeOrders, recentLedger, unread: unread.count, directs: team.count, dailyIncome };
}

/* ------------------------------ Produits ------------------------------ */
export async function getActiveProducts() {
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder), asc(products.price));
}

export async function getProductById(id: string) {
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return p ?? null;
}

/* ------------------------------ Paiement ------------------------------ */
export async function getPaymentForUser(userId: string, reference: string) {
  const [row] = await db
    .select({ payment: paymentTransactions, order: orders })
    .from(paymentTransactions)
    .innerJoin(orders, eq(orders.id, paymentTransactions.orderId))
    .where(and(eq(paymentTransactions.reference, reference), eq(paymentTransactions.userId, userId)))
    .limit(1);
  return row ?? null;
}

/* ------------------------------ Historique ------------------------------ */
export async function getLedger(userId: string, page: number) {
  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.userId, userId))
      .orderBy(desc(ledgerEntries.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(ledgerEntries).where(eq(ledgerEntries.userId, userId)),
  ]);
  return paged(rows, count, page);
}

export async function getPayments(userId: string, page: number) {
  const [rows, [{ count }]] = await Promise.all([
    db
      .select({ payment: paymentTransactions, productName: orders.productName })
      .from(paymentTransactions)
      .innerJoin(orders, eq(orders.id, paymentTransactions.orderId))
      .where(eq(paymentTransactions.userId, userId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(paymentTransactions).where(eq(paymentTransactions.userId, userId)),
  ]);
  return paged(rows, count, page);
}

export async function getOrders(userId: string, page: number) {
  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), inArray(orders.status, ["active", "completed"])))
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.userId, userId), inArray(orders.status, ["active", "completed"]))),
  ]);
  return paged(rows, count, page);
}

export async function getWithdrawals(userId: string, page: number) {
  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(withdrawals).where(eq(withdrawals.userId, userId)),
  ]);
  return paged(rows, count, page);
}

/* ------------------------------ Notifications ------------------------------ */
export async function getNotifications(userId: string, page: number) {
  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(eq(notifications.userId, userId)),
  ]);
  return paged(rows, count, page);
}

export async function getUnreadCount(userId: string) {
  const [r] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return r.count;
}

/* ------------------------------ Équipe ------------------------------ */
export async function getTeamData(userId: string, page: number) {
  const levelCounts = await db
    .select({ level: referrals.level, count: sql<number>`count(*)::int` })
    .from(referrals)
    .where(eq(referrals.referrerId, userId))
    .groupBy(referrals.level);
  const counts = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
  for (const r of levelCounts) counts[r.level as 1 | 2 | 3] = r.count;

  const members = await db
    .select({
      id: profiles.id,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      level: referrals.level,
      referredBy: profiles.referredBy,
      createdAt: profiles.createdAt,
      invested: sql<number>`coalesce((select total_invested from user_balances b where b.user_id = ${profiles.id}), 0)::bigint`,
    })
    .from(referrals)
    .innerJoin(profiles, eq(profiles.id, referrals.referredId))
    .where(eq(referrals.referrerId, userId))
    .orderBy(asc(referrals.level), desc(profiles.createdAt))
    .limit(200);

  const [commissions, [{ count }], [totals]] = await Promise.all([
    db
      .select({
        id: referralCommissions.id,
        amount: referralCommissions.amount,
        level: referralCommissions.level,
        createdAt: referralCommissions.createdAt,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
      })
      .from(referralCommissions)
      .innerJoin(profiles, eq(profiles.id, referralCommissions.sourceUserId))
      .where(eq(referralCommissions.beneficiaryId, userId))
      .orderBy(desc(referralCommissions.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(referralCommissions).where(eq(referralCommissions.beneficiaryId, userId)),
    db
      .select({ total: sql<number>`coalesce(sum(${referralCommissions.amount}), 0)::bigint` })
      .from(referralCommissions)
      .where(eq(referralCommissions.beneficiaryId, userId)),
  ]);
  return { counts, members, commissions: paged(commissions, count, page), totalCommission: Number(totals.total) };
}

export async function getSponsor(userId: string) {
  const [me] = await db.select({ referredBy: profiles.referredBy }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!me?.referredBy) return null;
  const [s] = await db
    .select({ firstName: profiles.firstName, lastName: profiles.lastName, referralCode: profiles.referralCode })
    .from(profiles)
    .where(eq(profiles.id, me.referredBy))
    .limit(1);
  return s ?? null;
}
