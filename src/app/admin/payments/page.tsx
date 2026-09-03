import Link from "next/link";
import { adminConfirmPaymentAction } from "@/lib/actions/admin";
import { formatDateTime, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { listPayments } from "@/lib/queries/admin";
import { pageOf } from "@/lib/queries/user";
import { ConfirmForm, StatusBadge } from "@/components/client";
import { Card, EmptyState, Icon, Input, PageHeader, Pagination, buttonClass, cn } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const FILTERS = ["all", "pending", "paid", "failed", "cancelled"] as const;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const q = sp.q ?? "";
  const { t, locale } = await getT();
  const data = await listPayments(status, q, pageOf(sp.page));
  const money = (n: number) => formatMoney(n, locale);
  return (
    <div className="space-y-4">
      <PageHeader title={t("admin.payments.title")} subtitle={`${data.total}`} />
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white border border-slate-200 p-1">
          {FILTERS.map((f) => (
            <Link key={f} href={`/admin/payments?status=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium", status === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
              {f === "all" ? t("common.all") : t(`status.${f}` as DictKey)}
            </Link>
          ))}
        </div>
        <form className="flex gap-2 flex-1">
          <input type="hidden" name="status" value={status} />
          <Input name="q" defaultValue={q} placeholder={`${t("common.reference")} / ${t("common.email")}`} />
          <button className={buttonClass("secondary", "md")}><Icon name="search" className="w-4 h-4" /></button>
        </form>
      </div>
      <Card>
        {data.rows.length === 0 ? <EmptyState title={t("common.empty")} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-4 py-2">{t("common.reference")}</th>
                  <th className="px-4 py-2">{t("common.user")}</th>
                  <th className="px-4 py-2 hidden md:table-cell">{t("common.product")}</th>
                  <th className="px-4 py-2">{t("common.amount")}</th>
                  <th className="px-4 py-2 hidden sm:table-cell">{t("common.method")}</th>
                  <th className="px-4 py-2">{t("common.status")}</th>
                  <th className="px-4 py-2 hidden lg:table-cell">{t("common.date")}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map(({ payment: p, firstName, lastName, email, productName, userId }) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5"><p className="font-mono text-xs">{p.reference}</p><p className="text-[10px] text-slate-400 font-mono">{p.id.slice(0, 8)}… {p.providerReference ? `· ${p.providerReference}` : ""}</p></td>
                    <td className="px-4 py-2.5"><Link href={`/admin/users/${userId}`} className="font-medium text-emerald-700 hover:underline">{firstName} {lastName}</Link><p className="text-xs text-slate-500">{email}</p></td>
                    <td className="px-4 py-2.5 hidden md:table-cell">{productName}</td>
                    <td className="px-4 py-2.5 font-bold tabular-nums">{money(p.amount)}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">{t(`method.${p.method}` as DictKey)}{p.isDemo && <span className="ml-1 text-[10px] font-bold text-amber-700">DEMO</span>}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-slate-500">{formatDateTime(p.paidAt ?? p.createdAt, locale)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {p.status === "pending" && (
                        <ConfirmForm action={adminConfirmPaymentAction} confirmMessage={`${t("common.confirm")} ${p.reference} — ${money(p.amount)} ?`}>
                          <input type="hidden" name="reference" value={p.reference} />
                          <button className={buttonClass("primary", "sm")}>{t("common.confirm")}</button>
                        </ConfirmForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin/payments" params={{ status, q }} labels={{ prev: t("common.previous"), next: t("common.next"), page: t("common.page", { page: data.page, total: data.totalPages }) }} />
    </div>
  );
}
