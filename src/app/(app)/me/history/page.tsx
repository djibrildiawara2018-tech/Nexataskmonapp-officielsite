import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getLedger, getOrders, getPayments, getWithdrawals, pageOf } from "@/lib/queries/user";
import { StatusBadge } from "@/components/client";
import { Card, EmptyState, Icon, Pagination, cn } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const TABS = ["ledger", "payments", "orders", "withdrawals"] as const;
type Tab = (typeof TABS)[number];

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "ledger";
  const page = pageOf(sp.page);
  const { t, locale } = await getT();
  const money = (n: number) => formatMoney(n, locale);
  const tabLabels: Record<Tab, string> = { ledger: t("me.ledger"), payments: t("me.payments"), orders: t("me.orders"), withdrawals: t("me.withdrawals") };

  let content: React.ReactNode;
  let paging = { page: 1, totalPages: 1 };

  if (tab === "ledger") {
    const data = await getLedger(user.id, page);
    paging = data;
    content = data.rows.length === 0 ? (
      <EmptyState title={t("dash.noTransactions")} />
    ) : (
      <ul className="divide-y divide-slate-100">
        {data.rows.map((e) => {
          const pos = e.balanceAfter > e.balanceBefore;
          const neg = e.balanceAfter < e.balanceBefore;
          return (
            <li key={e.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t(`ledger.${e.type}` as DictKey)}</p>
                <p className="text-xs text-slate-500 truncate">{e.description ?? ""} · {formatDateTime(e.createdAt, locale)}</p>
              </div>
              <div className="text-right">
                <p className={cn("font-bold tabular-nums", pos ? "text-emerald-700" : neg ? "text-rose-600" : "text-slate-500")}>
                  {pos ? "+" : neg ? "−" : ""}
                  {money(e.amount)}
                </p>
                <p className="text-[11px] text-slate-400 tabular-nums">{t("common.balance")}: {money(e.balanceAfter)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  } else if (tab === "payments") {
    const data = await getPayments(user.id, page);
    paging = data;
    content = data.rows.length === 0 ? (
      <EmptyState title={t("common.empty")} />
    ) : (
      <ul className="divide-y divide-slate-100">
        {data.rows.map(({ payment: p, productName }) => (
          <li key={p.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{productName}</p>
              <p className="text-xs text-slate-500 truncate">{p.reference} · {t(`method.${p.method}` as DictKey)} · {formatDateTime(p.createdAt, locale)}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-bold tabular-nums">{money(p.amount)}</p>
              {p.status === "pending" ? (
                <Link href={`/checkout/${p.reference}`} className="text-xs font-semibold text-amber-700 underline">{t("status.pending")} →</Link>
              ) : (
                <StatusBadge status={p.status} />
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  } else if (tab === "orders") {
    const data = await getOrders(user.id, page);
    paging = data;
    content = data.rows.length === 0 ? (
      <EmptyState title={t("dash.noActiveProducts")} />
    ) : (
      <ul className="divide-y divide-slate-100">
        {data.rows.map((o) => (
          <li key={o.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{o.productName}</p>
                <p className="text-xs text-slate-500">{money(o.price)} · +{money(o.dailyBonus)}{t("common.perDay")} · {formatDate(o.startedAt, locale)} → {formatDate(o.endsAt, locale)}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-xs text-emerald-700 mt-1 tabular-nums">{t("dash.progress", { paid: o.bonusDaysPaid, total: o.durationDays })} · {money(o.totalBonusPaid)}</p>
          </li>
        ))}
      </ul>
    );
  } else {
    const data = await getWithdrawals(user.id, page);
    paging = data;
    content = data.rows.length === 0 ? (
      <EmptyState title={t("withdraw.empty")} />
    ) : (
      <ul className="divide-y divide-slate-100">
        {data.rows.map((w) => (
          <li key={w.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold tabular-nums">{money(w.amount)}</p>
              <p className="text-xs text-slate-500">{t(`method.${w.method}` as DictKey)} · {w.phone} · {formatDateTime(w.createdAt, locale)}</p>
            </div>
            <StatusBadge status={w.status} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/me" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
        <Icon name="arrowLeft" className="w-4 h-4" /> {t("me.title")}
      </Link>
      <h1 className="text-xl font-extrabold">{t("me.history")}</h1>
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((tb) => (
          <Link key={tb} href={`/me/history?tab=${tb}`} className={cn("flex-1 text-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium", tab === tb ? "bg-white shadow-sm text-emerald-700" : "text-slate-600")}>
            {tabLabels[tb]}
          </Link>
        ))}
      </div>
      <Card>{content}</Card>
      <Pagination page={paging.page} totalPages={paging.totalPages} basePath="/me/history" params={{ tab }} labels={{ prev: t("common.previous"), next: t("common.next"), page: t("common.page", { page: paging.page, total: paging.totalPages }) }} />
    </div>
  );
}
