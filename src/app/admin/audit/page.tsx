import { formatDateTime } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { listAuditLogs } from "@/lib/queries/admin";
import { pageOf } from "@/lib/queries/user";
import { Badge, Card, EmptyState, PageHeader, Pagination } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const data = await listAuditLogs(pageOf(sp.page));
  return (
    <div className="space-y-4">
      <PageHeader title={t("admin.audit")} subtitle={`${data.total}`} />
      <Card>
        {data.rows.length === 0 ? <EmptyState title={t("common.empty")} /> : (
          <ul className="divide-y divide-slate-100">
            {data.rows.map(({ log, adminEmail }) => (
              <li key={log.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="violet">{log.action}</Badge>
                  <span className="text-slate-500">{log.entityType}</span>
                  {log.entityId && <span className="font-mono text-xs text-slate-400">{log.entityId}</span>}
                  <span className="ml-auto text-xs text-slate-500">{formatDateTime(log.createdAt, locale)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{t("admin.audit.admin")}: {adminEmail ?? "system"} {log.ip ? `· ${t("admin.audit.ip")}: ${log.ip}` : ""}</p>
                {(log.oldValue || log.newValue) && (
                  <div className="grid sm:grid-cols-2 gap-2 mt-2">
                    {log.oldValue && <pre className="text-[11px] bg-rose-50 text-rose-900 rounded-lg p-2 overflow-x-auto"><b>{t("admin.audit.old")}</b>{"\n"}{JSON.stringify(log.oldValue, null, 1)}</pre>}
                    {log.newValue && <pre className="text-[11px] bg-emerald-50 text-emerald-900 rounded-lg p-2 overflow-x-auto"><b>{t("admin.audit.new")}</b>{"\n"}{JSON.stringify(log.newValue, null, 1)}</pre>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/admin/audit" labels={{ prev: t("common.previous"), next: t("common.next"), page: t("common.page", { page: data.page, total: data.totalPages }) }} />
    </div>
  );
}
