import Link from "next/link";
import { notFound } from "next/navigation";
import { buyProductAction } from "@/lib/actions/user";
import { DEMO_MODE } from "@/lib/config";
import { formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getProductById } from "@/lib/queries/user";
import { ConfirmForm, SubmitButton } from "@/components/client";
import { Alert, Badge, Card, CardBody, Icon } from "@/components/ui";
import { Photo } from "@/components/photo";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, locale } = await getT();
  const product = /^[0-9a-f-]{36}$/i.test(id) ? await getProductById(id) : null;
  if (!product) notFound();
  const money = (n: number) => formatMoney(n, locale);
  const total = product.dailyBonus * product.durationDays;
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
        <Icon name="arrowLeft" className="w-4 h-4" /> {t("products.backToProducts")}
      </Link>
      <Card className="overflow-hidden">
        <div className="relative h-56 sm:h-72 bg-gradient-to-br from-emerald-600 to-emerald-900 text-white">
          {product.imageUrl && <Photo src={product.imageUrl} alt={product.name} priority sizes="(max-width: 768px) 100vw, 672px" />}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-100/90">{t("common.product")}</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold drop-shadow">{product.name}</h1>
            </div>
            {!product.isActive && <Badge tone="rose">{t("products.inactive")}</Badge>}
          </div>
        </div>
        <CardBody className="space-y-4">
          <dl className="grid grid-cols-2 gap-3">
            {[
              [t("products.price"), money(product.price)],
              [t("products.dailyBonus"), `+${money(product.dailyBonus)}${t("common.perDay")}`],
              [t("products.duration"), `${product.durationDays} ${t("common.days")}`],
              [t("products.totalReturn"), money(total)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-bold text-slate-900 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {product.description && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">{t("common.description")}</h2>
              <p className="text-sm text-slate-600 whitespace-pre-line">{product.description}</p>
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">{t("products.conditions")}</h2>
            <p className="text-xs text-slate-500 leading-relaxed">{t("products.conditionsText")}</p>
          </div>
          {DEMO_MODE && <Alert tone="warning">{t("checkout.demoNotice")}</Alert>}
          <Alert tone="info">{t("products.purchaseIntro")}</Alert>
          {product.isActive && (
            <ConfirmForm action={buyProductAction} confirmMessage={t("products.confirmDialog", { name: product.name, price: money(product.price) })}>
              <input type="hidden" name="productId" value={product.id} />
              <SubmitButton size="lg" className="w-full">
                <Icon name="card" className="w-5 h-5" />
                {t("products.confirmPurchase")} · {money(product.price)}
              </SubmitButton>
            </ConfirmForm>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
