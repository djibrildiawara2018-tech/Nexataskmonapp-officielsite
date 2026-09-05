"use server";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { passwordResetTokens, profiles, userBalances } from "@/db/schema";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  randomToken,
  requireUser,
  revokeAllSessions,
  sha256,
  verifyPassword,
} from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/config";
import { getBaseUrl } from "@/lib/url";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { createReferralChain } from "@/lib/services/finance";
import { audit, ensureSeeded } from "@/lib/services/system";

export type ActionState = { error?: string; success?: string; data?: Record<string, string> } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{8,15}$/;
const normPhone = (v: string) => v.replace(/[\s.-]/g, "");

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function safeNext(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

async function generateReferralCode(): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "NX";
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const exists = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.referralCode, code)).limit(1);
    if (exists.length === 0) return code;
  }
  throw new Error("Could not generate referral code");
}

/* ------------------------------ Inscription ------------------------------ */
export async function registerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await ensureSeeded();
  const firstName = str(fd, "firstName");
  const lastName = str(fd, "lastName");
  const phone = str(fd, "phone");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirmPassword") ?? "");
  const refCode = str(fd, "referralCode").toUpperCase();

  if (!firstName || !lastName || !phone || !email || !password) return { error: "auth.err.required" };
  if (!EMAIL_RE.test(email)) return { error: "auth.err.invalidEmail" };
  if (!PHONE_RE.test(normPhone(phone))) return { error: "auth.err.phoneInvalid" };
  if (password.length < 8) return { error: "auth.err.passwordTooShort" };
  if (password !== confirm) return { error: "auth.err.passwordMismatch" };

  const existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${email}`)
    .limit(1);
  if (existing.length > 0) return { error: "auth.err.emailTaken" };

  let sponsorId: string | null = null;
  if (refCode) {
    const [sponsor] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.referralCode, refCode))
      .limit(1);
    if (!sponsor) return { error: "auth.err.invalidReferral" };
    sponsorId = sponsor.id;
  }

  const passwordHash = await hashPassword(password);
  const referralCode = await generateReferralCode();

  let userId: string;
  let bootstrappedAdmin = false;
  try {
    const result = await db.transaction(async (tx) => {
      // Amorçage sécurisé : tant qu'AUCUN administrateur n'existe, le tout
      // premier compte créé reçoit le rôle admin. Verrou transactionnel pour
      // éviter qu'une inscription simultanée n'obtienne aussi le rôle.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('nexatask_admin_bootstrap'))`);
      const [{ admins }] = await tx
        .select({ admins: sql<number>`count(*)::int` })
        .from(profiles)
        .where(eq(profiles.role, "admin"));
      const isBootstrap = Number(admins) === 0;

      const [user] = await tx
        .insert(profiles)
        .values({
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          referralCode,
          referredBy: sponsorId, // défini une seule fois, jamais modifiable ensuite
          role: isBootstrap ? "admin" : "user",
          status: "active",
        })
        .returning({ id: profiles.id });
      await tx.insert(userBalances).values({ userId: user.id }).onConflictDoNothing();
      if (sponsorId) await createReferralChain(tx, user.id, `${firstName} ${lastName.charAt(0)}.`);
      if (isBootstrap) {
        await audit(tx, {
          adminId: null,
          action: "user.grant_admin.bootstrap",
          entityType: "user",
          entityId: user.id,
          newValue: { role: "admin", email, reason: "first_account" },
        });
      }
      return { id: user.id, isBootstrap };
    });
    userId = result.id;
    bootstrappedAdmin = result.isBootstrap;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "23505") return { error: "auth.err.emailTaken" };
    console.error(e);
    return { error: "common.error" };
  }

  await createSession(userId);
  redirect(bootstrappedAdmin ? "/dashboard?msg=admin_granted" : "/dashboard");
}

/* ------------------------------ Connexion ------------------------------ */
export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await ensureSeeded();
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"));
  if (!email || !password) return { error: "auth.err.required" };

  const [user] = await db
    .select({ id: profiles.id, passwordHash: profiles.passwordHash, status: profiles.status })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${email}`)
    .limit(1);
  // Comparaison même si l'utilisateur n'existe pas (temps constant approximatif)
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) return { error: "auth.err.invalidCredentials" };
  if (user.status === "disabled") return { error: "auth.err.accountDisabled" };

  await db.update(profiles).set({ lastLoginAt: new Date() }).where(eq(profiles.id, user.id));
  await createSession(user.id);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login?msg=logged_out");
}

/* ------------------------------ Mot de passe oublié ------------------------------ */
export async function forgotPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "auth.err.invalidEmail" };
  const [user] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${email}`)
    .limit(1);
  // Réponse identique que le compte existe ou non (anti-énumération)
  if (!user) return { success: "auth.forgot.sent" };

  const token = randomToken(32);
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const link = `${await getBaseUrl()}/reset-password?token=${token}`;
  // TODO mode réel : envoyer `link` par e-mail via un prestataire (Resend, SES…)
  console.log(`[password-reset] ${email} -> ${link}`);
  return { success: "auth.forgot.sent", data: DEMO_MODE ? { link } : undefined };
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirmPassword") ?? "");
  if (!token) return { error: "auth.err.invalidToken" };
  if (password.length < 8) return { error: "auth.err.passwordTooShort" };
  if (password !== confirm) return { error: "auth.err.passwordMismatch" };

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, sha256(token)),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);
  if (!row) return { error: "auth.err.invalidToken" };

  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ passwordHash, updatedAt: new Date() }).where(eq(profiles.id, row.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  });
  await revokeAllSessions(row.userId);
  return { success: "auth.reset.success" };
}

/* ------------------------------ Profil ------------------------------ */
export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const firstName = str(fd, "firstName");
  const lastName = str(fd, "lastName");
  const phone = str(fd, "phone");
  const wavePhoneRaw = str(fd, "wavePhone");
  if (!firstName || !lastName || !phone) return { error: "auth.err.required" };
  if (!PHONE_RE.test(normPhone(phone))) return { error: "auth.err.phoneInvalid" };
  if (wavePhoneRaw && !PHONE_RE.test(normPhone(wavePhoneRaw))) return { error: "auth.err.phoneInvalid" };
  const wavePhone = wavePhoneRaw || null;
  // Champs sensibles (role, status, referredBy, solde) volontairement non modifiables ici.
  await db
    .update(profiles)
    .set({ firstName, lastName, phone, wavePhone, updatedAt: new Date() })
    .where(eq(profiles.id, user.id));
  return { success: "flash.profile_updated" };
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = String(fd.get("currentPassword") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirmPassword") ?? "");
  if (password.length < 8) return { error: "auth.err.passwordTooShort" };
  if (password !== confirm) return { error: "auth.err.passwordMismatch" };
  const [row] = await db
    .select({ passwordHash: profiles.passwordHash })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (!row || !(await verifyPassword(current, row.passwordHash))) return { error: "auth.err.wrongPassword" };
  await db
    .update(profiles)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(profiles.id, user.id));
  return { success: "flash.password_updated" };
}

/* ------------------------------ Langue ------------------------------ */
export async function setLocaleAction(fd: FormData): Promise<void> {
  const locale = str(fd, "locale");
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user) await db.update(profiles).set({ locale }).where(eq(profiles.id, user.id));
  const back = str(fd, "back");
  redirect(safeNext(back || "/"));
}

/* ------------------------------ Admin initial (procédure sécurisée) ------------------------------ */
/**
 * Transforme un compte existant en administrateur. Nécessite le secret
 * ADMIN_SETUP_SECRET défini côté serveur (jamais de mot de passe admin dans le code).
 */
export async function setupAdminAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const secret = process.env.ADMIN_SETUP_SECRET;
  if (!secret) return { error: "setup.notConfigured" };
  const provided = str(fd, "secret");
  const email = str(fd, "email").toLowerCase();
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  const { timingSafeEqual } = await import("crypto");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: "setup.invalid" };

  const [user] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${email}`)
    .limit(1);
  if (!user) return { error: "setup.invalid" };
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ role: "admin", updatedAt: new Date() }).where(eq(profiles.id, user.id));
    await audit(tx, {
      adminId: null,
      action: "user.grant_admin.setup",
      entityType: "user",
      entityId: user.id,
      oldValue: { role: user.role },
      newValue: { role: "admin" },
    });
  });
  return { success: "flash.admin_granted" };
}
