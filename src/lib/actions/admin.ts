"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { products, profiles } from "@/db/schema";
import { requireAdmin, revokeAllSessions } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/config";
import {
  accrueBonuses,
  approveWithdrawal,
  completeWithdrawal,
  confirmPayment,
  FinanceError,
  rejectWithdrawal,
} from "@/lib/services/finance";
import { audit, DEFAULT_HOME_BANNER, getDemoDayOffset, getHomeSettings, notify, setSetting } from "@/lib/services/system";
import type { ActionState } from "./auth";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function int(fd: FormData, key: string): number {
  return Math.round(Number(str(fd, key).replace(/\s/g, "")));
}
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ------------------------------ Produits ------------------------------ */
export async function saveProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const slug = slugify(str(fd, "slug") || name);
  const description = str(fd, "description");
  const imageUrl = str(fd, "imageUrl");
  const price = int(fd, "price");
  const dailyBonus = int(fd, "dailyBonus");
  const durationDays = int(fd, "durationDays");
  const sortOrder = int(fd, "sortOrder") || 0;
  const isActive = fd.get("isActive") === "on";
  if (!name || !slug || !Number.isFinite(price) || price <= 0 || dailyBonus < 0 || durationDays <= 0) {
    return { error: "auth.err.required" };
  }
  const values = { name, slug, description: description || null, imageUrl: imageUrl || null, price, dailyBonus, durationDays, sortOrder, isActive };
  try {
    await db.transaction(async (tx) => {
      if (id) {
        const [old] = await tx.select().from(products).where(eq(products.id, id)).limit(1);
        if (!old) throw new FinanceError("products.notFound");
        await tx.update(products).set({ ...values, updatedAt: new Date() }).where(eq(products.id, id));
        await audit(tx, {
          adminId: admin.id,
          action: "product.update",
          entityType: "product",
          entityId: id,
          oldValue: { name: old.name, price: old.price, dailyBonus: old.dailyBonus, durationDays: old.durationDays, isActive: old.isActive, description: old.description, imageUrl: old.imageUrl },
          newValue: values,
        });
      } else {
        const [created] = await tx.insert(products).values(values).returning({ id: products.id });
        await audit(tx, { adminId: admin.id, action: "product.create", entityType: "product", entityId: created.id, newValue: values });
      }
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "23505") return { error: "admin.products.slug" };
    if (e instanceof FinanceError) return { error: e.code };
    console.error(e);
    return { error: "common.error" };
  }
  revalidatePath("/products");
  redirect("/admin/products?msg=product_saved");
}

export async function toggleProductAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const [old] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!old) redirect("/admin/products");
  await db.transaction(async (tx) => {
    await tx.update(products).set({ isActive: !old.isActive, updatedAt: new Date() }).where(eq(products.id, id));
    await audit(tx, {
      adminId: admin.id,
      action: old.isActive ? "product.deactivate" : "product.activate",
      entityType: "product",
      entityId: id,
      oldValue: { isActive: old.isActive },
      newValue: { isActive: !old.isActive },
    });
  });
  revalidatePath("/products");
  redirect("/admin/products?msg=product_saved");
}

/* ------------------------------ Utilisateurs ------------------------------ */
export async function toggleUserStatusAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) redirect(`/admin/users/${id}`); // pas d'auto-désactivation
  const [u] = await db.select({ status: profiles.status }).from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!u) redirect("/admin/users");
  const next = u.status === "active" ? "disabled" : "active";
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ status: next, updatedAt: new Date() }).where(eq(profiles.id, id));
    await audit(tx, {
      adminId: admin.id,
      action: next === "disabled" ? "user.disable" : "user.enable",
      entityType: "user",
      entityId: id,
      oldValue: { status: u.status },
      newValue: { status: next },
    });
    await notify(tx, { userId: id, type: "account_updated", title: "Compte mis à jour", data: { status: next } });
  });
  if (next === "disabled") await revokeAllSessions(id);
  redirect(`/admin/users/${id}?msg=user_updated`);
}

export async function toggleUserRoleAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  if (id === admin.id) redirect(`/admin/users/${id}`); // un admin ne se retire pas lui-même
  const [u] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!u) redirect("/admin/users");
  const next = u.role === "admin" ? "user" : "admin";
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ role: next, updatedAt: new Date() }).where(eq(profiles.id, id));
    await audit(tx, {
      adminId: admin.id,
      action: next === "admin" ? "user.grant_admin" : "user.revoke_admin",
      entityType: "user",
      entityId: id,
      oldValue: { role: u.role },
      newValue: { role: next },
    });
  });
  redirect(`/admin/users/${id}?msg=user_updated`);
}

/* ------------------------------ Retraits ------------------------------ */
export async function withdrawalDecisionAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const decision = str(fd, "decision");
  const note = str(fd, "note") || undefined;
  const back = str(fd, "back") || "/admin/withdrawals";
  try {
    if (decision === "approve") await approveWithdrawal(admin.id, id, note);
    else if (decision === "reject") await rejectWithdrawal(admin.id, id, note);
    else if (decision === "complete") await completeWithdrawal(admin.id, id);
  } catch (e) {
    console.error(e);
    redirect(`${back}${back.includes("?") ? "&" : "?"}msg=error`);
  }
  revalidatePath("/admin/withdrawals");
  redirect(`${back}${back.includes("?") ? "&" : "?"}msg=withdrawal_updated`);
}

/* ------------------------------ Paiements ------------------------------ */
/** Confirmation manuelle par un admin (ex: virement vérifié hors ligne). Journalisée. */
export async function adminConfirmPaymentAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reference = str(fd, "reference");
  try {
    await confirmPayment(reference, { source: "admin", actorId: admin.id, providerReference: `ADMIN-${admin.id.slice(0, 8)}` });
  } catch (e) {
    console.error(e);
    redirect("/admin/payments?msg=error");
  }
  redirect("/admin/payments?msg=payment_confirmed");
}

/* ------------------------------ Page d'accueil & Telegram ------------------------------ */
/** Accepte https://t.me/…, telegram.me, tg:// ou un simple @nom_utilisateur. "" = non configuré. */
function normalizeTelegramLink(raw: string): string | null {
  const s = raw.trim();
  if (!s) return "";
  if (/^@?[A-Za-z0-9_]{4,64}$/.test(s)) return `https://t.me/${s.replace(/^@/, "")}`;
  if (/^tg:\/\/[A-Za-z0-9_?=&.\-]+$/.test(s)) return s;
  try {
    const u = new URL(s);
    const hosts = ["t.me", "www.t.me", "telegram.me", "www.telegram.me", "telegram.dog"];
    if (u.protocol === "https:" && hosts.includes(u.hostname)) return u.toString();
  } catch {
    /* URL invalide */
  }
  return null;
}

export async function saveHomeSettingsAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const imageUrl = str(fd, "bannerImageUrl");
  const title = str(fd, "bannerTitle").slice(0, 80);
  const text = str(fd, "bannerText").slice(0, 240);
  const support = normalizeTelegramLink(str(fd, "telegramSupport"));
  const group = normalizeTelegramLink(str(fd, "telegramGroup"));
  const validImage = imageUrl === "" || imageUrl.startsWith("/") || /^https?:\/\/\S+$/i.test(imageUrl);
  if (support === null || group === null || !validImage) redirect("/admin/settings?msg=error");

  const old = await getHomeSettings();
  const banner = { imageUrl: imageUrl || DEFAULT_HOME_BANNER.imageUrl, title, text };
  const telegram = { support, group };
  await setSetting("home_banner", banner);
  await setSetting("telegram_links", telegram);
  await audit(db, {
    adminId: admin.id,
    action: "settings.update_home",
    entityType: "system",
    entityId: "home",
    oldValue: { banner: old.banner, telegram: old.telegram },
    newValue: { banner, telegram },
  });
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/admin/settings?msg=settings_saved");
}

/* ------------------------------ Outils démo / bonus ------------------------------ */
export async function runAccrualAction(): Promise<void> {
  const admin = await requireAdmin();
  const result = await accrueBonuses({ limit: 2000 });
  await audit(db, { adminId: admin.id, action: "bonus.accrue", entityType: "system", newValue: result });
  redirect(`/admin/settings?msg=accrual_done&orders=${result.processed}&credits=${result.credits}`);
}

export async function advanceDemoDayAction(): Promise<void> {
  const admin = await requireAdmin();
  if (!DEMO_MODE) redirect("/admin/settings");
  const current = await getDemoDayOffset();
  await setSetting("demo_day_offset", current + 1);
  await audit(db, { adminId: admin.id, action: "demo.advance_day", entityType: "system", oldValue: { offset: current }, newValue: { offset: current + 1 } });
  const result = await accrueBonuses({ limit: 2000 });
  redirect(`/admin/settings?msg=day_advanced&orders=${result.processed}&credits=${result.credits}`);
}
