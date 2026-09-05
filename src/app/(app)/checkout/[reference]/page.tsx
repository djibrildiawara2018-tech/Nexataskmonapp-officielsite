import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { cancelPaymentAction } from "@/lib/actions/user";
import { DEMO_MODE } from "@/lib/config";
import { formatDateTime, formatMoney } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import { getPaymentForUser } from "@/lib/queries/user";
import { getPaymentProvider } from "@/lib/services/payment";
import { AutoRefresh, StatusBadge } from "@/components/client";
import { Alert, Card, CardBody, Icon, LinkButton, buttonClass } from "@/components/ui";
import { DemoPaymentPanel } from "./demo-panel";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ reference: string }> }) {
  const user = await requireUser();
  const { reference } = await params;
  const { t, locale } = await getT();
  const row = await getPaymentForUser(user.id, reference); // scopé à l'utilisateur
  if (!row) notFound();
  const { payment, order } = row;
  const money = (n: number) => formatMoney(n, locale);
  const provider = getPaymentProvider();

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <AutoRefresh enabled={payment.status === "pending" && !DEMO_MODE} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("checkout.title")}</h1>
        <StatusBadge status={payment.status} />
      </div>

      {payment.status === "paid" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardBody className="text-center py-8">
            <span className="mx-auto w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-3">
              <Icon name="check" className="w-7 h-7" />
            </span>
            <h2 className="text-lg font-extrabold text-emerald-900">{t("checkout.successTitle")}</h2>
            <p className="text-sm text-emerald-800 mt-1">{t("checkout.successBody")}</p>
            <LinkButton href="/dashboard" className="mt-5">
              {t("checkout.goDashboard")} <Icon name="arrowRight" className="w-4 h-4" />
            </LinkButton>
          </CardBody>
        </Card>
      )}
      {(payment.status === "failed" || payment.status === "cancelled") && (
        <Card className="border-rose-200 bg-rose-50">
          <CardBody className="text-center py-8">
            <span className="mx-auto w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center mb-3">
              <Icon name="x" className="w-7 h-7" />
            </span>
            <h2 className="text-lg font-extrabold text-rose-900">{t(payment.status === "failed" ? "checkout.failedTitle" : "checkout.cancelledTitle")}</h2>
            <Link href={`/products/${payment.productId}`} className={buttonClass("primary", "md", "mt-5")}>
              {t("checkout.retry")}
            </Link>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-bold">{t("checkout.summary")}</h2>
          <dl className="text-sm divide-y divide-slate-100">
            {[
              [t("common.product"), order.productName],
              [t("common.amount"), money(payment.amount)],
              [t("products.dailyBonus"), `+${money(order.dailyBonus)}${t("common.perDay")}`],
              [t("products.duration"), `${order.durationDays} ${t("common.days")}`],
              [t("common.reference"), payment.reference],
              [t("common.method"), t(`method.${payment.method}` as DictKey)],
              [t("common.date"), formatDateTime(payment.createdAt, locale)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-semibold text-right break-all">{v}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      {payment.status === "pending" && (
        <>
          {DEMO_MODE ? (
            <DemoPaymentPanel reference={payment.reference} amountLabel={money(payment.amount)} />
          ) : provider.name === "manual" ? (
            <Card className="border-emerald-200">
              <CardBody className="space-y-3">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {t("checkout.awaiting")}
                </p>
                {(() => {
                  const meta = payment.metadata as { depositAccount?: { label: string; phone: string } } | null;
                  const account = meta?.depositAccount;
                  if (!account) {
                    return <p className="text-sm text-rose-600">Aucun numéro de dépôt disponible. Contactez le support.</p>;
                  }
                  return (
                    <div className="rounded-xl bg-emerald-50 p-4 space-y-1">
                      <p className="text-xs text-emerald-700">Envoyez {money(payment.amount)} via Wave à :</p>
                      <p className="text-lg font-extrabold text-emerald-900">{account.phone}</p>
                      <p className="text-xs text-emerald-700">{account.label}</p>
                    </div>
                  );
                })()}
                <p className="text-xs text-slate-500">Une fois le paiement effectué, notre équipe confirmera votre commande sous peu.</p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="space-y-3">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {t("checkout.awaiting")}
                </p>
                <p className="text-xs text-slate-500">{t("checkout.payReal", { provider: provider.name })}</p>
              </CardBody>
            </Card>
          )}
          <form action={cancelPaymentAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <button className={buttonClass("ghost", "md", "w-full !text-rose-600")}>{t("checkout.cancelPayment")}</button>
          </form>
        </>
      )}
      <Alert tone="info">
        <span className="inline-flex gap-2">
          <Icon name="lock" className="w-4 h-4 shrink-0 mt-0.5" /> {t("checkout.secureNote")}
        </span>
      </Alert>
    </div>
  );
}
