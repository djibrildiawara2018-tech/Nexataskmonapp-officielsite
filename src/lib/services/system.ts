import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db, type DbTx } from "@/db";
import { appSettings, auditLogs, notifications, products, roles } from "@/db/schema";
import { getRequestMeta } from "@/lib/auth/session";

type Executor = DbTx | typeof db;

export type NotificationType = (typeof notifications.$inferInsert)["type"];

/* ------------------------------------------------------------------ */
/* Notifications (le texte est rendu dans la langue du lecteur via i18n) */
/* ------------------------------------------------------------------ */
export async function notify(
  ex: Executor,
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  await ex.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    data: input.data ?? null,
  });
}

/* ------------------------------------------------------------------ */
/* Journal d'audit administrateur                                      */
/* ------------------------------------------------------------------ */
export async function audit(
  ex: Executor,
  input: {
    adminId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  },
): Promise<void> {
  const meta = await getRequestMeta();
  await ex.insert(auditLogs).values({
    adminId: input.adminId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    ip: meta.ip,
  });
}

/* ------------------------------------------------------------------ */
/* Paramètres applicatifs                                              */
/* ------------------------------------------------------------------ */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return rows[0] ? (rows[0].value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

/** Décalage de jours simulé (mode démo uniquement) pour tester les bonus. */
export async function getDemoDayOffset(): Promise<number> {
  const v = await getSetting<number>("demo_day_offset", 0);
  return Number.isFinite(v) ? Number(v) : 0;
}

const DEFAULT_MIN_WITHDRAWAL = 1000;
const DEFAULT_WITHDRAWAL_FEE_PERCENT = 15;

export async function getMinWithdrawal(): Promise<number> {
  return getSetting<number>("min_withdrawal", DEFAULT_MIN_WITHDRAWAL);
}
export async function setMinWithdrawal(value: number): Promise<void> {
  await setSetting("min_withdrawal", value);
}

export async function getWithdrawalFeePercent(): Promise<number> {
  return getSetting<number>("withdrawal_fee_percent", DEFAULT_WITHDRAWAL_FEE_PERCENT);
}
export async function setWithdrawalFeePercent(value: number): Promise<void> {
  await setSetting("withdrawal_fee_percent", value);
}

export async function isMaintenanceMode(): Promise<boolean> {
  return getSetting<boolean>("maintenance_mode", false);
}
export async function setMaintenanceMode(value: boolean): Promise<void> {
  await setSetting("maintenance_mode", value);
}

/* ------------------------------------------------------------------ */
/* Page d'accueil (bannière) & liens Telegram – modifiables par l'admin */
/* ------------------------------------------------------------------ */
export type HomeBanner = { imageUrl: string; title: string; text: string };
export type TelegramLinks = { support: string; group: string };

export const DEFAULT_HOME_BANNER: HomeBanner = { imageUrl: "/images/home-banner.jpg", title: "", text: "" };
export const DEFAULT_TELEGRAM_LINKS: TelegramLinks = { support: "", group: "" };

export async function getHomeSettings(): Promise<{ banner: HomeBanner; telegram: TelegramLinks }> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, ["home_banner", "telegram_links"]));
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  const banner = { ...DEFAULT_HOME_BANNER, ...((map.home_banner as Partial<HomeBanner> | undefined) ?? {}) };
  const telegram = { ...DEFAULT_TELEGRAM_LINKS, ...((map.telegram_links as Partial<TelegramLinks> | undefined) ?? {}) };
  if (!banner.imageUrl) banner.imageUrl = DEFAULT_HOME_BANNER.imageUrl;
  return { banner, telegram };
}

/* ------------------------------------------------------------------ */
/* Seed idempotent : rôles + produits initiaux (montants en base)       */
/* ------------------------------------------------------------------ */
const INITIAL_PRODUCTS = [
  { name: "Nexa Start", slug: "nexa-start", price: 5000, dailyBonus: 500, durationDays: 180, sortOrder: 1 },
  { name: "Nexa Basic", slug: "nexa-basic", price: 10000, dailyBonus: 1000, durationDays: 180, sortOrder: 2 },
  { name: "Nexa Plus", slug: "nexa-plus", price: 20000, dailyBonus: 2000, durationDays: 180, sortOrder: 3 },
  { name: "Nexa Pro", slug: "nexa-pro", price: 40000, dailyBonus: 4000, durationDays: 180, sortOrder: 4 },
  { name: "Nexa Premium", slug: "nexa-premium", price: 70000, dailyBonus: 7000, durationDays: 180, sortOrder: 5 },
  { name: "Nexa Elite", slug: "nexa-elite", price: 100000, dailyBonus: 10000, durationDays: 180, sortOrder: 6 },
].map((p) => ({ ...p, imageUrl: `/images/products/${p.slug}.jpg` }));

const globalSeed = globalThis as typeof globalThis & { __nexaSeeded?: Promise<void> };

export function ensureSeeded(): Promise<void> {
  if (!globalSeed.__nexaSeeded) {
    globalSeed.__nexaSeeded = (async () => {
      try {
        await db
          .insert(roles)
          .values([
            { name: "user", description: "Utilisateur standard" },
            { name: "admin", description: "Administrateur" },
          ])
          .onConflictDoNothing();
        const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
        if (Number(count) === 0) {
          await db
            .insert(products)
            .values(
              INITIAL_PRODUCTS.map((p) => ({
                ...p,
                description: `Produit ${p.name} : bonus indicatif de ${p.dailyBonus.toLocaleString("fr-FR")} FCFA par jour pendant ${p.durationDays} jours.`,
                isActive: true,
              })),
            )
            .onConflictDoNothing();
        }
      } catch (err) {
        // On réessaiera à la prochaine requête (ex: base pas encore migrée)
        globalSeed.__nexaSeeded = undefined;
        console.error("[seed] failed", err);
      }
    })();
  }
  return globalSeed.__nexaSeeded;
}
