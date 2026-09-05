import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { profiles, sessions } from "@/db/schema";
import { SESSION_DAYS } from "@/lib/config";

export const SESSION_COOKIE = "nx_session";

/* ---------- Mots de passe : jamais stockés en clair ---------- */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export async function getRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = (fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip")) || null;
    return { ip, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/* ---------- Sessions ---------- */
export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  const meta = await getRequestMeta();
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt,
    ip: meta.ip,
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  store.delete(SESSION_COOKIE);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  wavePhone: string | null;
  referralCode: string;
  referredBy: string | null;
  role: string;
  status: "active" | "disabled";
  locale: string;
  createdAt: Date;
};

/** Utilisateur courant (mis en cache par requête). Ne renvoie jamais le hash. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      phone: profiles.phone,
      wavePhone: profiles.wavePhone,
      referralCode: profiles.referralCode,
      referredBy: profiles.referredBy,
      role: profiles.role,
      status: profiles.status,
      locale: profiles.locale,
      createdAt: profiles.createdAt,
    })
    .from(sessions)
    .innerJoin(profiles, eq(profiles.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
});

/** Protège une page privée. Un compte désactivé est déconnecté. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "disabled") {
    redirect("/api/auth/logout?reason=disabled");
  }
  return user;
}

/** Accès strictement réservé au rôle admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard?msg=forbidden");
  return user;
}

export function isAdmin(user: SessionUser | null): boolean {
  return !!user && user.role === "admin" && user.status === "active";
}
