import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getProductById } from "@/lib/queries/user";
import { Alert, Icon, PageHeader } from "@/components/ui";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const p = /^[0-9a-f-]{36}$/i.test(id) ? await getProductById(id) : null;
  if (!p) notFound();
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"><Icon name="arrowLeft" className="w-4 h-4" /> {t("admin.products")}</Link>
      <PageHeader title={t("admin.products.edit")} subtitle={p.name} />
      <Alert tone="info">{t("admin.products.note")}</Alert>
      <ProductForm product={{ id: p.id, name: p.name, slug: p.slug, description: p.description, imageUrl: p.imageUrl, price: p.price, dailyBonus: p.dailyBonus, durationDays: p.durationDays, sortOrder: p.sortOrder, isActive: p.isActive }} />
    </div>
  );
}
