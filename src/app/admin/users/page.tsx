import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { listUsers } from "@/lib/queries/admin";
import { pageOf } from "@/lib/queries/user";
import { StatusBadge } from "@/components/client";
import { Badge, Card, EmptyState, Icon, Input, PageHeader, Pagination, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const { t, locale } = await getT();
  const data = await listUsers(q, pageOf(sp.page));
  return (
    <div className="space-y-4">
      <PageHeader title={t("admin.users")} subtitle={`${data.total}`} />
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder={t("admin.users.search")} />
        <button className={buttonClass("primary", "md")}>
          <Icon name="search" className="w-4 h-4" /> <span className="hidden sm:inline">{t("common.search")}</span>
        </button>
      </form>
      <Card>
        {data.rows.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-4 py-2">{t("common.user")}</th>
                  <th className="px-4 py-2 hidden md:table-cell">{t("common.phone")}</th>
                  <th className="px-4 py-2">{t("common.balance")}</th>
                  <th className="px-4 py-2 hidden sm:table-cell">{t("dash.totalInvested")}</th>
                  <th className="px-4 py-2">{t("common.status")}</th>
                  <th className="px-4 py-2 hidden lg:table-cell">{t("common.date")}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{u.firstName} {u.lastName} {u.role === "admin" && <Badge tone="violet">admin</Badge>}</p>
                      <p className="text-xs text-slate-500">{u.email} · {u.referralCode}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">{u.phone}</td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold">{formatMoney(u.available ?? 0, locale)}</td>
                    <td className="px-4 py-2.5 tabular-nums hidden sm:table-cell">{formatMoney(u.totalInvested ?? 0, locale)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-slate-500">{formatDate(u.createdAt, locale)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/admin/users/${u.id}`} className={buttonClass("secondary", "sm")}>{t("common.view")}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin/users" params={{ q }} labels={{ prev: t("common.previous"), next: t("common.next"), page: t("common.page", { page: data.page, total: data.totalPages }) }} />
    </div>
  );
}
