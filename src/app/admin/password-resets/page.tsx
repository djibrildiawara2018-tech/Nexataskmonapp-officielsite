import { formatDateTime } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { listPendingPasswordResets } from "@/lib/queries/admin";
import { Card, EmptyState, PageHeader, Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPasswordResetsPage() {
  const { t, locale } = await getT();
  const rows = await listPendingPasswordResets();
  return (
    <div className="space-y-4">
      <PageHeader title={t("admin.passwordResets.title")} subtitle={`${rows.length}`} />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title={t("admin.passwordResets.empty")} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {r.firstName} {r.lastName} <span className="text-slate-500 font-normal">· {r.email}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("admin.passwordResets.expiresAt")} {formatDateTime(r.expiresAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 bg-slate-900 text-white rounded-xl px-4 py-2">
                  <Icon name="lock" className="w-4 h-4" />
                  <span className="font-mono font-extrabold text-lg tracking-widest">{r.code}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
