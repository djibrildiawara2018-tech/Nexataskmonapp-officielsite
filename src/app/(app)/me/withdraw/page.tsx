import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { DEMO_MODE, MIN_WITHDRAWAL } from "@/lib/config";
import { formatDateTime, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getBalance, getWithdrawals, pageOf } from "@/lib/queries/user";
import { StatusBadge } from "@/components/client";
import { Alert, Card, CardBody, EmptyState, Icon, Pagination, SectionTitle } from "@/components/ui";
import { WithdrawForm } from "./form";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function WithdrawPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const [balance, list] = await Promise.all([getBalance(user.id), getWithdrawals(user.id, pageOf(sp.page))]);
  const money = (n: number) => formatMoney(n, locale);
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Link href="/me" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
        <Icon name="arrowLeft" className="w-4 h-4" /> {t("me.title")}
      </Link>
      <div>
        <h1 className="text-xl font-extrabold">{t("withdraw.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("withdraw.subtitle")}</p>
      </div>
      {DEMO_MODE && <Alert tone="warning">{t("withdraw.demoNote")}</Alert>}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4 rounded-xl bg-emerald-50 p-3">
            <span className="text-sm text-emerald-800">{t("dash.availableBalance")}</span>
            <span className="font-extrabold text-emerald-900 tabular-nums">{money(balance.available)}</span>
          </div>
          <WithdrawForm available={balance.available} availableLabel={money(balance.available)} minAmount={MIN_WITHDRAWAL} minLabel={money(MIN_WITHDRAWAL)} defaultPhone={user.phone} />
          <p className="text-xs text-slate-500 mt-3">{t("withdraw.note")}</p>
        </CardBody>
      </Card>
      <section>
        <SectionTitle>{t("withdraw.list")}</SectionTitle>
        <Card>
          {list.rows.length === 0 ? (
            <EmptyState icon={<Icon name="wallet" className="w-6 h-6" />} title={t("withdraw.empty")} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.rows.map((w) => (
                <li key={w.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold tabular-nums">{money(w.amount)}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {t(`method.${w.method}` as DictKey)} · {w.phone} · {formatDateTime(w.createdAt, locale)}
                    </p>
                    {w.adminNote && <p className="text-xs text-slate-500 italic">{w.adminNote}</p>}
                  </div>
                  <StatusBadge status={w.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Pagination page={list.page} totalPages={list.totalPages} basePath="/me/withdraw" labels={{ prev: t("common.previous"), next: t("common.next"), page: t("common.page", { page: list.page, total: list.totalPages }) }} />
      </section>
    </div>
  );
}
