import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleUserRoleAction, toggleUserStatusAction, resetUserFinancesAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getUserDetail } from "@/lib/queries/admin";
import { ConfirmForm, StatusBadge } from "@/components/client";
import { Input } from "@/components/ui";
import { Alert, Badge, Card, CardBody, EmptyState, Icon, SectionTitle, StatCard, buttonClass } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { t, locale } = await getT();
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await getUserDetail(id) : null;
  if (!d) notFound();
  const money = (n: number) => formatMoney(n, locale);
  const u = d.user;
  const isSelf = u.id === admin.id;
  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
        <Icon name="arrowLeft" className="w-4 h-4" /> {t("admin.users")}
      </Link>
      <Card>
        <CardBody className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-extrabold">{u.firstName.charAt(0)}{u.lastName.charAt(0)}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold flex items-center gap-2 flex-wrap">{u.firstName} {u.lastName} <StatusBadge status={u.status} /> {u.role === "admin" && <Badge tone="violet">admin</Badge>}</h1>
            <p className="text-sm text-slate-600">{u.email} · {u.phone}</p>
            <p className="text-xs text-slate-500 font-mono break-all">{u.id}</p>
            <p className="text-xs text-slate-500">{t("dash.referralCode")}: <b>{u.referralCode}</b> · {t("me.memberSince", { date: formatDateTime(u.createdAt, locale) })}</p>
            <p className="text-xs text-slate-500">{t("admin.users.sponsor")}: {d.sponsor ? <Link className="text-emerald-700 underline" href={`/admin/users/${d.sponsor.id}`}>{d.sponsor.firstName} {d.sponsor.lastName}</Link> : t("me.noSponsor")}</p>
          </div>
          {!isSelf && (
            <div className="flex flex-col gap-2">
              <ConfirmForm action={toggleUserStatusAction} confirmMessage={t(u.status === "active" ? "admin.users.confirmDisable" : "admin.users.confirmEnable")}>
                <input type="hidden" name="id" value={u.id} />
                <button className={buttonClass(u.status === "active" ? "danger" : "primary", "sm", "w-full")}>{t(u.status === "active" ? "admin.users.disable" : "admin.users.enable")}</button>
              </ConfirmForm>
              <ConfirmForm action={toggleUserRoleAction} confirmMessage={t("admin.users.confirmRole")}>
                <input type="hidden" name="id" value={u.id} />
                <button className={buttonClass("secondary", "sm", "w-full")}>{t(u.role === "admin" ? "admin.users.revokeAdmin" : "admin.users.makeAdmin")}</button>
              </ConfirmForm>
            </div>
          )}
        </CardBody>
      </Card>
      <Alert tone="info"><span className="inline-flex gap-2"><Icon name="lock" className="w-4 h-4 mt-0.5" />{t("admin.users.noPassword")}</span></Alert>
      <Card className="border-rose-300 bg-rose-50">
        <CardBody className="space-y-3">
          <h2 className="font-bold text-rose-800 flex items-center gap-2"><Icon name="alertTriangle" className="w-4 h-4" /> Zone dangereuse</h2>
          <p className="text-xs text-rose-700">
            Réinitialise définitivement tous les paiements, retraits, produits et le solde de cet utilisateur. Action irréversible.
          </p>
          <form action={resetUserFinancesAction} className="flex flex-col sm:flex-row gap-2">
            <input type="hidden" name="id" value={u.id} />
            <Input name="confirmValue" placeholder="Nom complet ou numéro de téléphone" className="flex-1" required />
            <button className={buttonClass("danger", "sm", "whitespace-nowrap")}>Réinitialiser</button>
          </form>
        </CardBody>
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("common.balance")} value={money(d.balance?.available ?? 0)} tone="emerald" />
        <StatCard label={t("dash.totalInvested")} value={money(d.balance?.totalInvested ?? 0)} />
        <StatCard label={t("dash.totalBonus")} value={money(d.balance?.totalBonus ?? 0)} tone="sky" />
        <StatCard label={t("dash.totalCommission")} value={money(d.balance?.totalCommission ?? 0)} tone="sky" />
        <StatCard label={t("dash.pendingWithdrawal")} value={money(d.balance?.pendingWithdrawal ?? 0)} tone="amber" />
        <StatCard label={t("admin.stats.withdrawn")} value={money(d.balance?.totalWithdrawn ?? 0)} tone="rose" />
        <StatCard label={t("admin.users.team")} value={`${d.team[1]} / ${d.team[2]} / ${d.team[3]}`} hint="N1 / N2 / N3" />
        <StatCard label={t("admin.users.orders")} value={d.orders.length} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <SectionTitle>{t("admin.users.orders")}</SectionTitle>
          <Card>{d.orders.length === 0 ? <EmptyState title={t("common.empty")} /> : (
            <ul className="divide-y divide-slate-100">{d.orders.map((o) => (
              <li key={o.id} className="px-4 py-2.5 flex justify-between items-center gap-3 text-sm"><div><p className="font-medium">{o.productName}</p><p className="text-xs text-slate-500">{money(o.price)} · {t("dash.progress", { paid: o.bonusDaysPaid, total: o.durationDays })} · {formatDateTime(o.createdAt, locale)}</p></div><StatusBadge status={o.status} /></li>
            ))}</ul>
          )}</Card>
        </section>
        <section>
          <SectionTitle>{t("admin.payments")}</SectionTitle>
          <Card>{d.payments.length === 0 ? <EmptyState title={t("common.empty")} /> : (
            <ul className="divide-y divide-slate-100">{d.payments.map((p) => (
              <li key={p.id} className="px-4 py-2.5 flex justify-between items-center gap-3 text-sm"><div><p className="font-medium">{p.reference}</p><p className="text-xs text-slate-500">{t(`method.${p.method}` as DictKey)} · {formatDateTime(p.createdAt, locale)}</p></div><div className="text-right"><p className="font-bold tabular-nums">{money(p.amount)}</p><StatusBadge status={p.status} /></div></li>
            ))}</ul>
          )}</Card>
        </section>
        <section>
          <SectionTitle>{t("admin.withdrawals")}</SectionTitle>
          <Card>{d.withdrawals.length === 0 ? <EmptyState title={t("common.empty")} /> : (
            <ul className="divide-y divide-slate-100">{d.withdrawals.map((w) => (
              <li key={w.id} className="px-4 py-2.5 flex justify-between items-center gap-3 text-sm"><div><p className="font-medium tabular-nums">{money(w.amount)}</p><p className="text-xs text-slate-500">{w.method} · {w.phone} · {formatDateTime(w.createdAt, locale)}</p></div><StatusBadge status={w.status} /></li>
            ))}</ul>
          )}</Card>
        </section>
        <section>
          <SectionTitle>{t("me.ledger")}</SectionTitle>
          <Card>{d.ledger.length === 0 ? <EmptyState title={t("common.empty")} /> : (
            <ul className="divide-y divide-slate-100">{d.ledger.map((e) => (
              <li key={e.id} className="px-4 py-2.5 flex justify-between items-center gap-3 text-sm"><div><p className="font-medium">{t(`ledger.${e.type}` as DictKey)}</p><p className="text-xs text-slate-500">{e.description} · {formatDateTime(e.createdAt, locale)}</p></div><div className="text-right tabular-nums"><p className="font-bold">{money(e.amount)}</p><p className="text-[11px] text-slate-400">→ {money(e.balanceAfter)}</p></div></li>
            ))}</ul>
          )}</Card>
        </section>
      </div>
    </div>
  );
}
