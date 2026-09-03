import "server-only";
import { and, asc, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  ledgerEntries,
  orders,
  paymentTransactions,
  products,
  profiles,
  referrals,
  userBalances,
  withdrawals,
} from "@/db/schema";
import { PAGE_SIZE } from "@/lib/config";

function paged<T>(rows: T[], total: number, page: number) {
  return { rows, page, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
const count = sql<number>`count(*)::int`;
const sum = (col: SQL | unknown) => sql<number>`coalesce(sum(${col}), 0)::bigint`;

/* ------------------------------ Statistiques ------------------------------ */
export async function getAdminStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [
    [users],
    [activeUsers],
    [newUsers],
    [productCount],
    [sales],
    [pendingPayments],
    [pendingWithdrawals],
    [activeInvestors],
    [bonus],
    [commission],
    [withdrawn],
  ] = await Promise.all([
    db.select({ count }).from(profiles),
    db.select({ count }).from(profiles).where(eq(profiles.status, "active")),
    db.select({ count }).from(profiles).where(gte(profiles.createdAt, weekAgo)),
    db.select({ count }).from(products),
    db
      .select({ count, total: sum(paymentTransactions.amount) })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.status, "paid")),
    db
      .select({ count, total: sum(paymentTransactions.amount) })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.status, "pending")),
    db.select({ count, total: sum(withdrawals.amount) }).from(withdrawals).where(eq(withdrawals.status, "pending")),
    db.select({ count: sql<number>`count(distinct ${orders.userId})::int` }).from(orders).where(eq(orders.status, "active")),
    db.select({ total: sum(userBalances.totalBonus) }).from(userBalances),
    db.select({ total: sum(userBalances.totalCommission) }).from(userBalances),
    db.select({ total: sum(userBalances.totalWithdrawn) }).from(userBalances),
  ]);
  const [recentPayments, recentWithdrawals] = await Promise.all([
    db
      .select({ payment: paymentTransactions, firstName: profiles.firstName, lastName: profiles.lastName, productName: orders.productName })
      .from(paymentTransactions)
      .innerJoin(profiles, eq(profiles.id, paymentTransactions.userId))
      .innerJoin(orders, eq(orders.id, paymentTransactions.orderId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(6),
    db
      .select({ withdrawal: withdrawals, firstName: profiles.firstName, lastName: profiles.lastName })
      .from(withdrawals)
      .innerJoin(profiles, eq(profiles.id, withdrawals.userId))
      .orderBy(desc(withdrawals.createdAt))
      .limit(6),
  ]);
  return {
    users: users.count,
    activeUsers: activeUsers.count,
    newUsers7d: newUsers.count,
    products: productCount.count,
    sales: sales.count,
    paidVolume: Number(sales.total),
    pendingPayments: pendingPayments.count,
    pendingPaymentsVolume: Number(pendingPayments.total),
    pendingWithdrawals: pendingWithdrawals.count,
    pendingWithdrawalsVolume: Number(pendingWithdrawals.total),
    activeInvestors: activeInvestors.count,
    bonusPaid: Number(bonus.total),
    commissionsPaid: Number(commission.total),
    withdrawn: Number(withdrawn.total),
    recentPayments,
    recentWithdrawals,
  };
}

/* ------------------------------ Utilisateurs ------------------------------ */
export async function listUsers(q: string, page: number) {
  const term = q.trim();
  const where = term
    ? or(
        ilike(profiles.firstName, `%${term}%`),
        ilike(profiles.lastName, `%${term}%`),
        ilike(profiles.email, `%${term}%`),
        ilike(profiles.phone, `%${term}%`),
        ilike(profiles.referralCode, `%${term}%`),
      )
    : undefined;
  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        email: profiles.email,
        phone: profiles.phone,
        role: profiles.role,
        status: profiles.status,
        referralCode: profiles.referralCode,
        createdAt: profiles.createdAt,
        available: userBalances.available,
        totalInvested: userBalances.totalInvested,
      })
      .from(profiles)
      .leftJoin(userBalances, eq(userBalances.userId, profiles.id))
      .where(where)
      .orderBy(desc(profiles.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count }).from(profiles).where(where),
  ]);
  return paged(rows, total, page);
}

export async function getUserDetail(id: string) {
  const [user] = await db
    .select({
      id: profiles.id,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      email: profiles.email,
      phone: profiles.phone,
      role: profiles.role,
      status: profiles.status,
      referralCode: profiles.referralCode,
      referredBy: profiles.referredBy,
      createdAt: profiles.createdAt,
      lastLoginAt: profiles.lastLoginAt,
    })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  if (!user) return null;
  const [balanceRow, sponsorRows, userOrders, payments, userWithdrawals, teamCounts, ledger] = await Promise.all([
    db.select().from(userBalances).where(eq(userBalances.userId, id)).limit(1),
    user.referredBy
      ? db
          .select({ id: profiles.id, firstName: profiles.firstName, lastName: profiles.lastName, email: profiles.email })
          .from(profiles)
          .where(eq(profiles.id, user.referredBy))
          .limit(1)
      : Promise.resolve([]),
    db.select().from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)).limit(20),
    db.select().from(paymentTransactions).where(eq(paymentTransactions.userId, id)).orderBy(desc(paymentTransactions.createdAt)).limit(20),
    db.select().from(withdrawals).where(eq(withdrawals.userId, id)).orderBy(desc(withdrawals.createdAt)).limit(20),
    db.select({ level: referrals.level, count }).from(referrals).where(eq(referrals.referrerId, id)).groupBy(referrals.level),
    db.select().from(ledgerEntries).where(eq(ledgerEntries.userId, id)).orderBy(desc(ledgerEntries.createdAt)).limit(20),
  ]);
  const team = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
  for (const t of teamCounts) team[t.level as 1 | 2 | 3] = t.count;
  return {
    user,
    balance: balanceRow[0] ?? null,
    sponsor: sponsorRows[0] ?? null,
    orders: userOrders,
    payments,
    withdrawals: userWithdrawals,
    team,
    ledger,
  };
}

/* ------------------------------ Produits ------------------------------ */
export async function listAllProducts() {
  return db
    .select({
      product: products,
      sales: sql<number>`(select count(*) from ${orders} o where o.product_id = ${products.id} and o.status in ('active','completed'))::int`,
    })
    .from(products)
    .orderBy(asc(products.sortOrder), asc(products.price));
}

/* ------------------------------ Paiements ------------------------------ */
type PaymentStatus = (typeof paymentTransactions.$inferSelect)["status"];
export async function listPayments(status: string, q: string, page: number) {
  const conds: SQL[] = [];
  if (["pending", "paid", "failed", "cancelled"].includes(status)) conds.push(eq(paymentTransactions.status, status as PaymentStatus));
  if (q.trim()) {
    conds.push(
      or(
        ilike(paymentTransactions.reference, `%${q.trim()}%`),
        ilike(profiles.email, `%${q.trim()}%`),
        ilike(profiles.lastName, `%${q.trim()}%`),
        ilike(profiles.phone, `%${q.trim()}%`),
      )!,
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select({ payment: paymentTransactions, firstName: profiles.firstName, lastName: profiles.lastName, email: profiles.email, productName: orders.productName, userId: profiles.id })
      .from(paymentTransactions)
      .innerJoin(profiles, eq(profiles.id, paymentTransactions.userId))
      .innerJoin(orders, eq(orders.id, paymentTransactions.orderId))
      .where(where)
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count }).from(paymentTransactions).innerJoin(profiles, eq(profiles.id, paymentTransactions.userId)).where(where),
  ]);
  return paged(rows, total, page);
}

/* ------------------------------ Retraits ------------------------------ */
type WithdrawalStatus = (typeof withdrawals.$inferSelect)["status"];
export async function listWithdrawals(status: string, page: number) {
  const where = ["pending", "approved", "rejected", "completed"].includes(status)
    ? eq(withdrawals.status, status as WithdrawalStatus)
    : undefined;
  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select({ withdrawal: withdrawals, firstName: profiles.firstName, lastName: profiles.lastName, email: profiles.email, userId: profiles.id })
      .from(withdrawals)
      .innerJoin(profiles, eq(profiles.id, withdrawals.userId))
      .where(where)
      .orderBy(asc(sql`case ${withdrawals.status} when 'pending' then 0 when 'approved' then 1 else 2 end`), desc(withdrawals.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count }).from(withdrawals).where(where),
  ]);
  return paged(rows, total, page);
}

/* ------------------------------ Audit ------------------------------ */
export async function listAuditLogs(page: number) {
  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select({ log: auditLogs, adminEmail: profiles.email })
      .from(auditLogs)
      .leftJoin(profiles, eq(profiles.id, auditLogs.adminId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count }).from(auditLogs),
  ]);
  return paged(rows, total, page);
}
