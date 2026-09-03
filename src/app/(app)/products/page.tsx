import Link from "next/link";
import { formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getActiveProducts } from "@/lib/queries/user";
import { Card, EmptyState, Icon, PageHeader, buttonClass } from "@/components/ui";
import { Photo } from "@/components/photo";

export const dynamic = "force-dynamic";

const tiers = ["from-emerald-500 to-emerald-700", "from-teal-500 to-emerald-700", "from-emerald-600 to-teal-800", "from-cyan-600 to-emerald-800", "from-emerald-700 to-slate-900", "from-amber-500 to-emerald-800"];

export default async function ProductsPage() {
  const { t, locale } = await getT();
  const products = await getActiveProducts();
  return (
    <div>
      <PageHeader title={t("products.title")} subtitle={t("products.subtitle")} />
      {products.length === 0 ? (
        <Card>
          <EmptyState title={t("products.empty")} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <Card key={p.id} className="overflow-hidden flex flex-col">
              <div className={`relative h-44 sm:h-40 bg-gradient-to-br ${tiers[i % tiers.length]} text-white`}>
                {p.imageUrl && <Photo src={p.imageUrl} alt={p.name} priority={i < 2} />}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-100/90">{t("common.product")}</p>
                  <h2 className="text-xl font-extrabold drop-shadow">{p.name}</h2>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-500">{t("products.price")}</p>
                    <p className="text-sm font-bold tabular-nums">{formatMoney(p.price, locale)}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-2">
                    <p className="text-[10px] text-emerald-700">{t("products.dailyBonus")}</p>
                    <p className="text-sm font-bold text-emerald-800 tabular-nums">+{formatMoney(p.dailyBonus, locale)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-500">{t("products.duration")}</p>
                    <p className="text-sm font-bold">
                      {p.durationDays} {t("common.days")}
                    </p>
                  </div>
                </div>
                {p.description && <p className="text-sm text-slate-500 line-clamp-2">{p.description}</p>}
                <div className="mt-auto flex gap-2">
                  <Link href={`/products/${p.id}`} className={buttonClass("secondary", "md", "flex-1")}>
                    {t("products.details")}
                  </Link>
                  <Link href={`/products/${p.id}`} className={buttonClass("primary", "md", "flex-1")}>
                    {t("products.buy")} <Icon name="arrowRight" className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
