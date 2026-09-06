import { requireUser } from "@/lib/auth/session";
import { REFERRAL_RATES } from "@/lib/config";
import { getBaseUrl } from "@/lib/url";
import { formatDate, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getTeamData, getTopReferrers, pageOf } from "@/lib/queries/user";
import { CopyButton, ShareButton } from "@/components/client";
import { Badge, Card, CardBody, EmptyState, Icon, PageHeader, Pagination, SectionTitle, StatCard, cn } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const { t, locale } = await getT();
  const [data, topReferrers] = await Promise.all([getTeamData(user.id, page), getTopReferrers(10)]);
  const link = `${await getBaseUrl()}/register?ref=${user.referralCode}`;
  const money = (n: number) => formatMoney(n, locale);

  // Arbre simple : niveau 1 → enfants (niveau 2) → petits-enfants (niveau 3)
  const byParent = new Map<string, typeof data.members>();
  for (const m of data.members) {
    const parent = m.level === 1 ? user.id : (m.referredBy ?? "");
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(m);
  }
  const Node = ({ m }: { m: (typeof data.members)[number] }) => (
    <li>
      <div className="flex items-center gap-3 py-2">
        <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", m.level === 1 ? "bg-emerald-600 text-white" : m.level === 2 ? "bg-emerald-200 text-emerald-900" : "bg-slate-200 text-slate-700")}>
          {m.firstName.charAt(0)}
          {m.lastName.charAt(0)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {m.firstName} {m.lastName.charAt(0)}.
          </p>
          <p className="text-xs text-slate-500">{t("team.joined", { date: formatDate(m.createdAt, locale) })}</p>
        </div>
        <div className="text-right">
          <Badge tone={m.level === 1 ? "emerald" : m.level === 2 ? "sky" : "slate"}>{t("common.level", { level: m.level })}</Badge>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">{money(Number(m.invested))}</p>
        </div>
      </div>
      {byParent.get(m.id)?.length ? (
        <ul className="ml-4 pl-4 border-l-2 border-emerald-100">
          {byParent.get(m.id)!.map((c) => (
            <Node key={c.id} m={c} />
          ))}
        </ul>
      ) : null}
    </li>
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("team.title")} subtitle={t("team.subtitle")} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("team.directs")} value={data.counts[1]} tone="emerald" icon={<Icon name="users" />} />
        <StatCard label={t("team.level2")} value={data.counts[2]} tone="sky" />
        <StatCard label={t("team.level3")} value={data.counts[3]} />
        <StatCard label={t("team.commissions")} value={money(data.totalCommission)} tone="amber" icon={<Icon name="gift" />} />
      </div>

      <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-0">
        <CardBody className="space-y-3">
          <p className="text-xs text-emerald-100 uppercase tracking-wide">{t("team.referralLink")}</p>
          <p className="text-2xl font-extrabold tracking-widest">{user.referralCode}</p>
          <p className="text-xs text-emerald-100 break-all">{link}</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={link} className="!bg-white !text-emerald-800" />
            <ShareButton text={t("team.shareText", { code: user.referralCode, link })} className="!bg-emerald-500 hover:!bg-emerald-400" />
          </div>
          <p className="text-[11px] text-emerald-100">{t("team.rates", { l1: REFERRAL_RATES[1], l2: REFERRAL_RATES[2], l3: REFERRAL_RATES[3] })}</p>
        </CardBody>
      </Card>

      {topReferrers.length > 0 && (
        <section>
          <SectionTitle>🏆 Top parrains</SectionTitle>
          <Card>
            <ul className="divide-y divide-slate-100">
              {topReferrers.map((r, i) => (
                <li key={r.userId} className={cn("flex items-center gap-3 px-4 py-3", r.userId === user.id && "bg-emerald-50")}>
                  <span className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-500",
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {r.firstName} {r.lastName.charAt(0)}. {r.userId === user.id && <span className="text-emerald-600">(vous)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{r.referralCount} filleul(s)</p>
                  </div>
                  <p className="font-bold text-emerald-700 tabular-nums">{money(Number(r.total))}</p>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>{t("team.tree")}</SectionTitle>
        <Card>
          {data.members.length === 0 ? (
            <EmptyState icon={<Icon name="users" className="w-6 h-6" />} title={t("team.noMembers")} />
          ) : (
            <CardBody>
              <p className="text-xs text-slate-500 mb-1">{t("team.members", { count: data.members.length })}</p>
              <ul className="divide-y divide-slate-100">
                {(byParent.get(user.id) ?? []).map((m) => (
                  <Node key={m.id} m={m} />
                ))}
              </ul>
            </CardBody>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>{t("team.history")}</SectionTitle>
        <Card>
          {data.commissions.rows.length === 0 ? (
            <EmptyState title={t("team.noCommissions")} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.commissions.rows.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{t("team.commissionFrom", { level: c.level, name: `${c.firstName} ${c.lastName.charAt(0)}.` })}</p>
                    <p className="text-xs text-slate-500">{formatDate(c.createdAt, locale)}</p>
                  </div>
                  <p className="font-bold text-emerald-700 tabular-nums">+{money(c.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Pagination page={data.commissions.page} totalPages={data.commissions.totalPages} basePath="/team" labels={{ prev: t("common.previous"), next: t("common.next"), page: t("common.page", { page: data.commissions.page, total: data.commissions.totalPages }) }} />
      </section>
    </div>
  );
}
