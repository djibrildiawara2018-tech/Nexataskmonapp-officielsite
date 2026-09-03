import Link from "next/link";
import { formatDateTime, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getAdminStats } from "@/lib/queries/admin";
import { StatusBadge } from "@/components/client";
import { Card, EmptyState, Icon, PageHeader, SectionTitle, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { t, locale } = await getT();
  const s = await getAdminStats();
  const money = (n: number) => formatMoney(n, locale);
  return (
    <div className="space-y-6">
      <PageHeader title={t("admin.dashboard")} />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <StatCard label={t("admin.stats.totalUsers")} value={s.users} hint={`${t("admin.stats.newUsers7d")}: ${s.newUsers7d}`} icon={<Icon name="users" />} />
        <StatCard label={t("admin.stats.activeUsers")} value={s.activeUsers} hint={`${t("admin.stats.activeInvestors")}: ${s.activeInvestors}`} tone="emerald" />
        <StatCard label={t("admin.stats.products")} value={s.products} icon={<Icon name="box" />} />
        <StatCard label={t("admin.stats.sales")} value={s.sales} hint={money(s.paidVolume)} tone="emerald" icon={<Icon name="trend" />} />
        <StatCard label={t("admin.stats.pendingPayments")} value={s.pendingPayments} hint={money(s.pendingPaymentsVolume)} tone="amber" icon={<Icon name="card" />} />
        <StatCard label={t("admin.stats.pendingWithdrawals")} value={s.pendingWithdrawals} hint={money(s.pendingWithdrawalsVolume)} tone="amber" icon={<Icon name="wallet" />} />
        <StatCard label={t("admin.stats.bonusPaid")} value={money(s.bonusPaid)} tone="sky" icon={<Icon name="gift" />} />
        <StatCard label={t("admin.stats.commissionsPaid")} value={money(s.commissionsPaid)} tone="sky" />
        <StatCard label={t("admin.stats.withdrawn")} value={money(s.withdrawn)} tone="rose" />
        <StatCard label={t("admin.stats.paidVolume")} value={money(s.paidVolume)} tone="emerald" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle action={<Link href="/admin/payments" className="text-sm font-medium text-emerald-700">{t("common.seeAll")}</Link>}>{t("admin.recentPayments")}</SectionTitle>
          <Card>
            {s.recentPayments.length === 0 ? (
              <EmptyState title={t("common.empty")} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {s.recentPayments.map(({ payment: p, firstName, lastName, productName }) => (
                  <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{firstName} {lastName} · {productName}</p>
                      <p className="text-xs text-slate-500">{p.reference} · {formatDateTime(p.createdAt, locale)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{money(p.amount)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
        <section>
          <SectionTitle action={<Link href="/admin/withdrawals" className="text-sm font-medium text-emerald-700">{t("common.seeAll")}</Link>}>{t("admin.recentWithdrawals")}</SectionTitle>
          <Card>
            {s.recentWithdrawals.length === 0 ? (
              <EmptyState title={t("common.empty")} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {s.recentWithdrawals.map(({ withdrawal: w, firstName, lastName }) => (
                  <li key={w.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{firstName} {lastName}</p>
                      <p className="text-xs text-slate-500">{w.method} · {w.phone} · {formatDateTime(w.createdAt, locale)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{money(w.amount)}</p>
                      <StatusBadge status={w.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
