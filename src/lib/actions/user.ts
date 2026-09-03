"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications, paymentTransactions, profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/config";
import {
  cancelPayment,
  confirmPayment,
  createOrderWithPayment,
  failPayment,
  FinanceError,
  requestWithdrawal,
} from "@/lib/services/finance";
import type { ActionState } from "./auth";

function errorState(e: unknown): ActionState {
  if (e instanceof FinanceError) return { error: e.code };
  console.error(e);
  return { error: "common.error" };
}

/* ------------------------------ Achat ------------------------------ */
export async function buyProductAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const productId = String(fd.get("productId") ?? "");
  if (!productId) redirect("/products");
  let target = "/products";
  try {
    const { payment, checkoutUrl } = await createOrderWithPayment(user.id, productId, user.phone);
    // En démo : page de checkout interne. En réel : URL du prestataire.
    target = DEMO_MODE || !checkoutUrl ? `/checkout/${payment.reference}` : checkoutUrl;
  } catch (e) {
    console.error(e);
    redirect("/products?msg=error");
  }
  redirect(target);
}

/** MODE DÉMO uniquement : simule la confirmation serveur d'un paiement. */
export async function simulateDemoPaymentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!DEMO_MODE) return { error: "common.unauthorized" };
  const reference = String(fd.get("reference") ?? "");
  const outcome = String(fd.get("outcome") ?? "success");
  const [p] = await db
    .select({ id: paymentTransactions.id, userId: paymentTransactions.userId, isDemo: paymentTransactions.isDemo })
    .from(paymentTransactions)
    .where(and(eq(paymentTransactions.reference, reference), eq(paymentTransactions.userId, user.id)))
    .limit(1);
  if (!p || !p.isDemo) return { error: "checkout.notFound" };
  try {
    if (outcome === "fail") {
      await failPayment(reference, { reason: "demo_simulated_failure" });
    } else {
      await confirmPayment(reference, { source: "demo", providerReference: `DEMO-${reference}` });
    }
  } catch (e) {
    return errorState(e);
  }
  revalidatePath(`/checkout/${reference}`);
  revalidatePath("/dashboard");
  return { success: outcome === "fail" ? "checkout.failedTitle" : "flash.payment_confirmed" };
}

export async function cancelPaymentAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const paymentId = String(fd.get("paymentId") ?? "");
  if (paymentId) await cancelPayment(user.id, paymentId);
  redirect("/products?msg=payment_cancelled");
}

/* ------------------------------ Retrait ------------------------------ */
export async function requestWithdrawalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const amount = Number(String(fd.get("amount") ?? "").replace(/\s/g, ""));
  const method = String(fd.get("method") ?? "");
  const phone = String(fd.get("phone") ?? "").trim();
  const allowed = ["wave", "orange_money", "mtn_momo", "moov_money"] as const;
  if (!allowed.includes(method as (typeof allowed)[number])) return { error: "auth.err.required" };
  if (!/^\+?[0-9]{8,15}$/.test(phone.replace(/[\s.-]/g, ""))) return { error: "auth.err.phoneInvalid" };
  try {
    await requestWithdrawal(user.id, { amount, method: method as (typeof allowed)[number], phone });
  } catch (e) {
    return errorState(e);
  }
  redirect("/me/withdraw?msg=withdrawal_requested");
}

/* ------------------------------ Notifications ------------------------------ */
export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
  revalidatePath("/me/notifications");
  revalidatePath("/dashboard");
}

/** Garde-fou : un utilisateur ne peut jamais modifier son parrain, son rôle ou son solde. */
export async function forbiddenSelfMutation(): Promise<ActionState> {
  const user = await requireUser();
  // Vérification défensive : ce chemin n'expose aucune mutation.
  await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return { error: "common.unauthorized" };
}
