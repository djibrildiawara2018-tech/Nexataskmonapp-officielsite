import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getDashboardData } from "@/lib/queries/user";
import { accrueBonuses } from "@/lib/services/finance";
import { getHomeSettings } from "@/lib/services/system";
import { Photo } from "@/components/photo";
import { TelegramFab } from "@/components/telegram-fab";
import { CopyButton } from "@/components/client";
import { Card, CardBody, EmptyState, Icon, LinkButton, SectionTitle, StatCard, cn } from "@/components/ui";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  // Calcul serveur idempotent des bonus dus (contraintes UNIQUE = jamais de double crédit)
  await accrueBonuses({ userId: user.id }).catch((e) => console.error("[accrue]", e));
  const { t, locale } = await getT();
  const [data, { banner, telegram }] = await Promise.all([getDashboardData(user.id), getHomeSettings()]);
  const money = (n: number) => formatMoney(n, locale);
  const bannerTitle = banner.title || t("home.banner.title");
  const bannerText = banner.text || t("home.banner.text");
  const totalEarned = data.balance.totalBonus + data.balance.totalCommission;

  const quick = [
    { href: "/products", icon: "box", label: t("nav.products") },
    { href: "/me/withdraw", icon: "wallet", label: t("dash.withdraw") },
    { href: "/team", icon: "users", label: t("dash.invite") },
    { href: "/me/notifications", icon: "bell", label: t("dash.notifications") },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Bannière d'accueil (photo + description) – modifiable dans /admin/settings */}
      <section className="relative h-44 sm:h-60 overflow-hidden rounded-3xl shadow-lg shadow-emerald-900/10">
        <Photo src={banner.imageUrl} alt="" priority sizes="(max-width: 1024px) 100vw, 1024px" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-900/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
          <h2 className="text-lg sm:text-2xl font-extrabold leading-tight drop-shadow">{bannerTitle}</h2>
          <p className="mt-1 max-w-xl text-xs sm:text-sm text-emerald-50/90 leading-snug">{bannerText}</p>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{formatDate(new Date(), locale)}</p>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{t("dash.welcome", { name: user.firstName })}</h1>
        </div>
        {data.unread > 0 && (
          <Link href="/me/notifications" className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg">
            {t("dash.unread", { count: data.unread })}
          </Link>
        )}
      </div>

      {/* Solde principal */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white p-5 shadow-lg shadow-emerald-700/20">
        <p className="text-emerald-100 text-xs uppercase tracking-wide">{t("dash.availableBalance")}</p>
        <p className="text-3xl sm:text-4xl font-extrabold mt-1 tabular-nums">{money(data.balance.available)}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 p-2.5">
            <p className="text-[10px] text-emerald-100">{t("dash.dailyIncome")}</p>
            <p className="font-bold text-sm tabular-nums">+{money(data.dailyIncome)}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5">
            <p className="text-[10px] text-emerald-100">{t("dash.totalEarned")}</p>
            <p className="font-bold text-sm tabular-nums">{money(totalEarned)}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5">
            <p className="text-[10px] text-emerald-100">{t("dash.totalInvested")}</p>
            <p className="font-bold text-sm tabular-nums">{money(data.balance.totalInvested)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <LinkButton href="/me/withdraw" variant="secondary" size="sm" className="flex-1 !bg-white/95 !text-emerald-800 !border-0">
            <Icon name="wallet" className="w-4 h-4" /> {t("dash.withdraw")}
          </LinkButton>
          <LinkButton href="/products" size="sm" className="flex-1 !bg-emerald-500 hover:!bg-emerald-400">
            <Icon name="plus" className="w-4 h-4" /> {t("products.buy")}
          </LinkButton>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-4 gap-2">
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-slate-200/80 p-3 text-center shadow-sm hover:border-emerald-300">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Icon name={q.icon} />
            </span>
            <span className="text-[11px] font-medium text-slate-700">{q.label}</span>
          </Link>
        ))}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("dash.totalBonus")} value={money(data.balance.totalBonus)} tone="emerald" icon={<Icon name="gift" />} />
        <StatCard label={t("dash.totalCommission")} value={money(data.balance.totalCommission)} tone="sky" icon={<Icon name="users" />} />
        <StatCard label={t("dash.pendingWithdrawal")} value={money(data.balance.pendingWithdrawal)} tone="amber" icon={<Icon name="clock" />} />
        <StatCard label={t("team.directs")} value={data.directs} icon={<Icon name="trend" />} />
      </div>

      {/* Produits actifs */}
      <section>
        <SectionTitle
          action={
            <Link href="/me/history?tab=orders" className="text-sm font-medium text-emerald-700">
              {t("common.seeAll")}
            </Link>
          }
        >
          {t("dash.activeProducts")}
        </SectionTitle>
        {data.activeOrders.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Icon name="box" className="w-6 h-6" />}
              title={t("dash.noActiveProducts")}
              action={<LinkButton href="/products">{t("dash.browseProducts")}</LinkButton>}
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.activeOrders.map((o) => {
              const pct = Math.min(100, Math.round((o.bonusDaysPaid / o.durationDays) * 100));
              return (
                <Card key={o.id}>
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{o.productName}</p>
                        <p className="text-xs text-slate-500">
                          +{money(o.dailyBonus)}
                          {t("common.perDay")} · {formatDate(o.endsAt, locale)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 tabular-nums">{money(o.totalBonusPaid)}</span>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{t("dash.progress", { paid: o.bonusDaysPaid, total: o.durationDays })}</p>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Dernières opérations */}
      <section>
        <SectionTitle
          action={
            <Link href="/me/history" className="text-sm font-medium text-emerald-700">
              {t("common.seeAll")}
            </Link>
          }
        >
          {t("dash.recentTransactions")}
        </SectionTitle>
        <Card>
          {data.recentLedger.length === 0 ? (
            <EmptyState title={t("dash.noTransactions")} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentLedger.map((e) => {
                const positive = e.balanceAfter > e.balanceBefore;
                const negative = e.balanceAfter < e.balanceBefore;
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        positive ? "bg-emerald-50 text-emerald-700" : negative ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <Icon name={e.type === "bonus" ? "gift" : e.type === "commission" ? "users" : e.type === "investment" ? "box" : "wallet"} className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{t(`ledger.${e.type}` as DictKey)}</p>
                      <p className="text-xs text-slate-500 truncate">{e.description ?? formatDate(e.createdAt, locale)}</p>
                    </div>
                    <p className={cn("text-sm font-bold tabular-nums", positive ? "text-emerald-700" : negative ? "text-rose-600" : "text-slate-500")}>
                      {positive ? "+" : negative ? "−" : ""}
                      {money(e.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      {/* Code de parrainage */}
      <Card className="bg-gradient-to-r from-emerald-50 to-white">
        <CardBody className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">{t("dash.referralCode")}</p>
            <p className="text-lg font-extrabold tracking-widest text-emerald-800">{user.referralCode}</p>
          </div>
          <CopyButton value={user.referralCode} />
        </CardBody>
      </Card>

      {/* Bouton flottant Telegram (service client / groupe officiel) */}
      <TelegramFab links={telegram} aboveBottomNav />
    </div>
  );
}
