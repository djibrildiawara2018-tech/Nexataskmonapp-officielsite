import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { Icon, PageHeader } from "@/components/ui";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const { t } = await getT();
  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"><Icon name="arrowLeft" className="w-4 h-4" /> {t("admin.products")}</Link>
      <PageHeader title={t("admin.products.new")} />
      <ProductForm />
    </div>
  );
}
