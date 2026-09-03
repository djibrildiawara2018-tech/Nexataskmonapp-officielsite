import Link from "next/link";
import { markNotificationsReadAction } from "@/lib/actions/user";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getNotifications, pageOf } from "@/lib/queries/user";
import { Card, EmptyState, Icon, Pagination, buttonClass, cn } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const icons: Record<string, string> = { purchase_confirmed: "box", payment_received: "card", bonus_credited: "gift", withdrawal_requested: "wallet", withdrawal_approved: "check", withdrawal_rejected: "x", withdrawal_completed: "wallet", new_referral: "users", commission_received: "trend", account_updated: "shield" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { t, locale, dict } = await getT();
  const data = await getNotifications(user.id, pageOf(sp.page));
  const hasUnread = data.rows.some((n) => !n.isRead);
  const render = (n: (typeof data.rows)[number]) => {
    const d = (n.data ?? {}) as Record<string, string | number>;
    const params: Record<string, string | number> = { ...d };
    if (typeof d.amount === "number") params.amount = formatMoney(d.amount, locale);
    const titleKey = `notif.${n.type}.title` as DictKey;
    const bodyKey = `notif.${n.type}.body` as DictKey;
    return { title: titleKey in dict ? t(titleKey) : n.title, body: bodyKey in dict ? t(bodyKey, params) : (n.body ?? "") };
  };
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/me" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
        <Icon name="arrowLeft" className="w-4 h-4" /> {t("me.title")}
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("notif.title")}</h1>
        {hasUnread && (
          <form action={markNotificationsReadAction}>
            <button className={buttonClass("subtle", "sm")}>{t("notif.markAllRead")}</button>
          </form>
        )}
      </div>
      <Card>
        {data.rows.length === 0 ? (
          <EmptyState icon={<Icon name="bell" className="w-6 h-6" />} title={t("notif.empty")} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.rows.map((n) => {
              const { title, body } = render(n);
              return (
                <li key={n.id} className={cn("px-4 py-3 flex gap-3", !n.isRead && "bg-emerald-50/50")}>
                  <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", n.isRead ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700")}>
                    <Icon name={icons[n.type] ?? "bell"} className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !n.isRead ? "font-bold" : "font-medium")}>{title}</p>
                    <p className="text-sm text-slate-600">{body}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(n.createdAt, locale)}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Pagination page={data.page} totalPages={data.totalPages} basePath="/me/notifications" labels={{ prev: t("common.previous"), next: t("common.next"), page: t("common.page", { page: data.page, total: data.totalPages }) }} />
    </div>
  );
}
