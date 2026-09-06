import Link from "next/link";
import { withdrawalDecisionAction } from "@/lib/actions/admin";
import { DEMO_MODE } from "@/lib/config";
import { formatDateTime, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { listWithdrawals } from "@/lib/queries/admin";
import { pageOf } from "@/lib/queries/user";
import { ConfirmForm, StatusBadge } from "@/components/client";
import { Alert, Card, EmptyState, PageHeader, Pagination, buttonClass, cn, inputClass } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const FILTERS = ["all", "pending", "approved", "completed", "rejected"] as const;

export default async function AdminWithdrawalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const { t, locale } = await getT();
  const data = await listWithdrawals(status, pageOf(sp.page));
  const money = (n: number) => formatMoney(n, locale);
  const back = `/admin/withdrawals?status=${status}`;
  return (
    <div className="space-y-4">
      <PageHeader title={t("admin.withdrawals.title")} subtitle={`${data.total}`} />
      {DEMO_MODE && <Alert tone="warning">{t("withdraw.demoNote")}</Alert>}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white border border-slate-200 p-1">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/withdrawals?status=${f}`} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium", status === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
            {f === "all" ? t("common.all") : t(`status.${f}` as DictKey)}
          </Link>
        ))}
      </div>
      <Card>
        {data.rows.length === 0 ? <EmptyState title={t("withdraw.empty")} /> : (
          <ul className="divide-y divide-slate-100">
            {data.rows.map(({ withdrawal: w, firstName, lastName, email, userId }) => (
              <li key={w.id} className="p-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-lg tabular-nums">{money(w.amount)} {w.isDemo && <span className="text-[10px] font-bold text-amber-700 align-middle">DEMO</span>}</p>
                    <p className="text-xs text-slate-500">Demandé : {money(w.amount)} · Frais ({w.feePercent}%) : -{money(w.feeAmount)}</p>
                    <p className="text-sm font-bold text-emerald-700">À envoyer réellement : {money(w.netAmount)}</p>
                    <p className="text-sm"><Link href={`/admin/users/${userId}`} className="font-medium text-emerald-700 hover:underline">{firstName} {lastName}</Link> <span className="text-slate-500">· {email}</span></p>
                    <p className="text-xs text-slate-500">{t(`method.${w.method}` as DictKey)} · {w.phone} · {formatDateTime(w.createdAt, locale)}</p>
                    {w.adminNote && <p className="text-xs italic text-slate-500 mt-1">{w.adminNote}</p>}
                    {w.providerReference && <p className="text-xs font-mono text-slate-400">{w.providerReference}</p>}
                    <p className="text-[10px] font-mono text-slate-400">{w.id}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                {(w.status === "pending" || w.status === "approved") && (
                  <div className="flex flex-col sm:flex-row gap-2 lg:justify-end">
                    {w.status === "pending" && (
                      <ConfirmForm action={withdrawalDecisionAction} confirmMessage={t("admin.withdrawals.confirmApprove", { amount: money(w.amount) })} className="flex gap-2">
                        <input type="hidden" name="id" value={w.id} /><input type="hidden" name="decision" value="approve" /><input type="hidden" name="back" value={back} />
                        <button className={buttonClass("primary", "sm")}>{t("admin.withdrawals.approve")}</button>
                      </ConfirmForm>
                    )}
                    {w.status === "approved" && (
                      <ConfirmForm action={withdrawalDecisionAction} confirmMessage={t("admin.withdrawals.confirmComplete")}>
                        <input type="hidden" name="id" value={w.id} /><input type="hidden" name="decision" value="complete" /><input type="hidden" name="back" value={back} />
                        <button className={buttonClass("primary", "sm")}>{t("admin.withdrawals.complete")}</button>
                      </ConfirmForm>
                    )}
                    <ConfirmForm action={withdrawalDecisionAction} confirmMessage={t("admin.withdrawals.confirmReject")} className="flex gap-2">
                      <input type="hidden" name="id" value={w.id} /><input type="hidden" name="decision" value="reject" /><input type="hidden" name="back" value={back} />
                      <input name="note" placeholder={t("admin.withdrawals.note")} className={cn(inputClass, "!h-9 text-sm w-40")} />
                      <button className={buttonClass("danger", "sm")}>{t("admin.withdrawals.reject")}</button>
                    </ConfirmForm>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin/withdrawals" params={{ status }} labels={{ prev: t("common.previous"), next: t("common.next"), page: t("common.page", { page: data.page, total: data.totalPages }) }} />
    </div>
  );
}
