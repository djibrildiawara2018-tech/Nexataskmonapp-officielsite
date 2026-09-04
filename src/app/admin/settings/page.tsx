import { advanceDemoDayAction, runAccrualAction, saveHomeSettingsAction, saveFinanceSettingsAction } from "@/lib/actions/admin";
import { DEMO_MODE } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { getPaymentProvider } from "@/lib/services/payment";
import { getDemoDayOffset, getHomeSettings, getMinWithdrawal, getWithdrawalFeePercent, isMaintenanceMode } from "@/lib/services/system";
import { Photo } from "@/components/photo";
import { TelegramIcon } from "@/components/telegram-fab";
import { ConfirmForm, ImageUploader } from "@/components/client";
import { Alert, Badge, Card, CardBody, Field, Icon, Input, PageHeader, Textarea, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const [offset, { banner, telegram }, minWithdrawal, feePercent, maintenanceMode] = await Promise.all([getDemoDayOffset(), getHomeSettings(), getMinWithdrawal(), getWithdrawalFeePercent(), isMaintenanceMode()]);
  const provider = getPaymentProvider();
  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title={t("admin.settings")} />
      {sp.orders !== undefined && <Alert tone="success">{t("admin.settings.accrualResult", { orders: sp.orders ?? 0, credits: sp.credits ?? 0 })}</Alert>}
      <Card>
        <CardBody className="space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-slate-500">{t("admin.settings.mode")}</span>{DEMO_MODE ? <Badge tone="amber">{t("admin.settings.demo")}</Badge> : <Badge tone="emerald">{t("admin.settings.real")}</Badge>}</div>
          <div className="flex items-center justify-between"><span className="text-slate-500">{t("admin.settings.provider")}</span><Badge>{provider.name}</Badge></div>
          <p className="text-xs text-slate-500">{t("admin.settings.realModeNote")}</p>
        </CardBody>
      </Card>
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-bold flex items-center gap-2"><Icon name="wallet" className="w-4 h-4 text-emerald-600" /> {t("admin.settings.finance")}</h2>
            <form action={saveFinanceSettingsAction} className="space-y-3">
              <Field label={t("admin.settings.minWithdrawal")} htmlFor="minWithdrawal">
                <Input id="minWithdrawal" name="minWithdrawal" type="number" inputMode="numeric" min={0} step={1} defaultValue={minWithdrawal} required />
              </Field>
              <Field label={t("admin.settings.feePercent")} htmlFor="feePercent">
                <Input id="feePercent" name="feePercent" type="number" inputMode="numeric" min={0} max={100} step={1} defaultValue={feePercent} required />
              </Field>
              <div className="flex items-center gap-2">
                <input id="maintenanceMode" name="maintenanceMode" type="checkbox" defaultChecked={maintenanceMode} />
                <label htmlFor="maintenanceMode" className="text-sm">{t("admin.settings.maintenanceMode")}</label>
              </div>
              <button className={buttonClass("primary", "md", "w-full sm:w-auto")}>{t("common.save")}</button>
            </form>
          </CardBody>
        </Card>
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-bold flex items-center gap-2"><Icon name="home" className="w-4 h-4 text-emerald-600" /> {t("admin.settings.home")}</h2>
          <p className="text-xs text-slate-500">{t("admin.settings.homeNote")}</p>
          <div className="relative h-36 overflow-hidden rounded-2xl bg-slate-100">
            <Photo src={banner.imageUrl} alt="" sizes="672px" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <p className="font-extrabold">{banner.title || t("home.banner.title")}</p>
              <p className="text-xs text-emerald-50/90 line-clamp-2">{banner.text || t("home.banner.text")}</p>
            </div>
          </div>
          <form action={saveHomeSettingsAction} className="space-y-4">
            <ImageUploader name="bannerImageUrl" defaultValue={banner.imageUrl} label={t("admin.settings.bannerImage")} />
            <Field label={t("admin.settings.bannerTitle")} htmlFor="bannerTitle">
              <Input id="bannerTitle" name="bannerTitle" defaultValue={banner.title} maxLength={80} placeholder={t("home.banner.title")} />
            </Field>
            <Field label={t("admin.settings.bannerText")} htmlFor="bannerText">
              <Textarea id="bannerText" name="bannerText" defaultValue={banner.text} maxLength={240} placeholder={t("home.banner.text")} />
            </Field>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 space-y-4">
              <p className="flex items-center gap-2 text-sm font-bold text-[#1d8dc4]"><TelegramIcon className="w-5 h-5" /> Telegram</p>
              <Field label={t("admin.settings.telegramSupport")} htmlFor="telegramSupport">
                <Input id="telegramSupport" name="telegramSupport" defaultValue={telegram.support} placeholder="https://t.me/…" inputMode="url" />
              </Field>
              <Field label={t("admin.settings.telegramGroup")} htmlFor="telegramGroup" hint={t("admin.settings.telegramHint")}>
                <Input id="telegramGroup" name="telegramGroup" defaultValue={telegram.group} placeholder="https://t.me/…" inputMode="url" />
              </Field>
            </div>
            <button className={buttonClass("primary", "md", "w-full sm:w-auto")}>{t("common.save")}</button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-bold flex items-center gap-2"><Icon name="gift" className="w-4 h-4 text-emerald-600" /> {t("admin.settings.demoTools")}</h2>
          <p className="text-xs text-slate-500">{t("admin.settings.cron")}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <form action={runAccrualAction}><button className={buttonClass("primary", "md", "w-full")}>{t("admin.settings.runAccrual")}</button></form>
            {DEMO_MODE && (
              <ConfirmForm action={advanceDemoDayAction} confirmMessage={`${t("admin.settings.advanceDay")} ?`}>
                <button className={buttonClass("warning", "md", "w-full")}>{t("admin.settings.advanceDay")}</button>
              </ConfirmForm>
            )}
          </div>
          {DEMO_MODE && <p className="text-xs text-amber-700 font-medium">{t("admin.settings.dayOffset", { days: offset })}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
