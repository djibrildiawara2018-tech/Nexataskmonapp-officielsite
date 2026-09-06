import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { requireUser, isAdmin } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getBalance, getSponsor, getUnreadCount, hasCompletedWithdrawal } from "@/lib/queries/user";
import { CopyButton, LanguageSwitcher } from "@/components/client";
import { Badge, Card, CardBody, Icon, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await requireUser();
  const { t, locale } = await getT();
  const [balance, sponsor, unread, withdrawn] = await Promise.all([getBalance(user.id), getSponsor(user.id), getUnreadCount(user.id), hasCompletedWithdrawal(user.id)]);
  const money = (n: number) => formatMoney(n, locale);
  const links = [
    { href: "/me/profile", icon: "user", label: t("me.editProfile") },
    { href: "/me/history", icon: "list", label: t("me.history") },
    { href: "/me/withdraw", icon: "wallet", label: t("me.withdrawals") },
    { href: "/me/notifications", icon: "bell", label: t("me.notifications"), badge: unread },
    { href: "/team", icon: "users", label: t("nav.team") },
  ] as const;
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardBody className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl font-extrabold">
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold truncate">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
            <p className="text-xs text-slate-500">{user.phone}</p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {isAdmin(user) && <Badge tone="violet">admin</Badge>}
            {withdrawn && <Badge tone="emerald">✓ Retrait effectué</Badge>}
          </div>
        </CardBody>
        <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-3 text-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">{t("common.balance")}</p>
            <p className="font-bold text-sm tabular-nums">{money(balance.available)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">{t("dash.totalEarned")}</p>
            <p className="font-bold text-sm tabular-nums text-emerald-700">{money(balance.totalBonus + balance.totalCommission)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">{t("dash.totalInvested")}</p>
            <p className="font-bold text-sm tabular-nums">{money(balance.totalInvested)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <ul className="divide-y divide-slate-100">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Icon name={l.icon} className="w-4 h-4" />
                </span>
                <span className="flex-1 text-sm font-medium">{l.label}</span>
                {"badge" in l && l.badge > 0 && <span className="text-xs font-bold text-white bg-rose-500 rounded-full px-2 py-0.5">{l.badge}</span>}
                <Icon name="arrowRight" className="w-4 h-4 text-slate-400" />
              </Link>
            </li>
          ))}
          {isAdmin(user) && (
            <li>
              <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 hover:bg-violet-50">
                <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                  <Icon name="shield" className="w-4 h-4" />
                </span>
                <span className="flex-1 text-sm font-medium">{t("admin.title")}</span>
                <Icon name="arrowRight" className="w-4 h-4 text-slate-400" />
              </Link>
            </li>
          )}
        </ul>
      </Card>

      <Card>
        <CardBody className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">{t("dash.referralCode")}</p>
              <p className="font-bold tracking-widest">{user.referralCode}</p>
            </div>
            <CopyButton value={user.referralCode} />
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("me.sponsor")}</p>
            <p className="font-medium">{sponsor ? `${sponsor.firstName} ${sponsor.lastName.charAt(0)}. (${sponsor.referralCode})` : t("me.noSponsor")}</p>
            <p className="text-[11px] text-slate-400">{t("me.sponsorLocked")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("me.userId")}</p>
            <p className="font-mono text-xs break-all">{user.id}</p>
          </div>
          <p className="text-xs text-slate-500">{t("me.memberSince", { date: formatDate(user.createdAt, locale) })}</p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">{t("common.language")}</span>
            <LanguageSwitcher />
          </div>
        </CardBody>
      </Card>

      <form action={logoutAction}>
        <button className={buttonClass("secondary", "lg", "w-full !text-rose-600")}>
          <Icon name="logout" className="w-4 h-4" /> {t("common.logout")}
        </button>
      </form>
    </div>
  );
}
