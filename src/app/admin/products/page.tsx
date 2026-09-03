import Link from "next/link";
import { toggleProductAction } from "@/lib/actions/admin";
import { formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { listAllProducts } from "@/lib/queries/admin";
import { ConfirmForm } from "@/components/client";
import { Alert, Badge, Card, EmptyState, Icon, PageHeader, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { t, locale } = await getT();
  const rows = await listAllProducts();
  return (
    <div className="space-y-4">
      <PageHeader title={t("admin.products")} action={<Link href="/admin/products/new" className={buttonClass("primary", "md")}><Icon name="plus" className="w-4 h-4" /> {t("admin.products.new")}</Link>} />
      <Alert tone="info">{t("admin.products.note")}</Alert>
      <Card>
        {rows.length === 0 ? <EmptyState title={t("products.empty")} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-4 py-2">{t("admin.products.name")}</th>
                  <th className="px-4 py-2">{t("products.price")}</th>
                  <th className="px-4 py-2 hidden sm:table-cell">{t("products.dailyBonus")}</th>
                  <th className="px-4 py-2 hidden sm:table-cell">{t("products.duration")}</th>
                  <th className="px-4 py-2 hidden md:table-cell">{t("admin.stats.sales")}</th>
                  <th className="px-4 py-2">{t("common.status")}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ product: p, sales }) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5"><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.slug}</p></td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold">{formatMoney(p.price, locale)}</td>
                    <td className="px-4 py-2.5 tabular-nums hidden sm:table-cell text-emerald-700">+{formatMoney(p.dailyBonus, locale)}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">{p.durationDays} {t("common.days")}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">{t("admin.products.sales", { count: sales })}</td>
                    <td className="px-4 py-2.5">{p.isActive ? <Badge tone="emerald">{t("status.active")}</Badge> : <Badge tone="rose">{t("status.disabled")}</Badge>}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/products/${p.id}`} className={buttonClass("secondary", "sm")}>{t("common.edit")}</Link>
                        <ConfirmForm action={toggleProductAction} confirmMessage={`${p.isActive ? t("admin.products.deactivate") : t("admin.products.activate")} — ${p.name} ?`}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className={buttonClass(p.isActive ? "warning" : "primary", "sm")}>{p.isActive ? t("admin.products.deactivate") : t("admin.products.activate")}</button>
                        </ConfirmForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
