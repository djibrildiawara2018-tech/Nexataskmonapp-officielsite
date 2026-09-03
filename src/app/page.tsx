import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { DemoBanner, LanguageSwitcher } from "@/components/client";
import { Photo } from "@/components/photo";
import { TelegramFab } from "@/components/telegram-fab";
import { getHomeSettings } from "@/lib/services/system";
import { buttonClass, Icon } from "@/components/ui";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const { t } = await getT();
  const { banner, telegram } = await getHomeSettings();
  const bannerTitle = banner.title || t("home.banner.title");
  const bannerText = banner.text || t("home.banner.text");
  const features = [
    { icon: "gift", title: t("landing.f1.title"), body: t("landing.f1.body") },
    { icon: "users", title: t("landing.f2.title"), body: t("landing.f2.body") },
    { icon: "shield", title: t("landing.f3.title"), body: t("landing.f3.body") },
  ] as const;
  return (
    <main className="min-h-dvh flex flex-col">
      {DEMO_MODE && <DemoBanner />}
      <header className="max-w-5xl mx-auto w-full px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 font-extrabold text-emerald-700 text-lg">
          <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm">N</span>
          NexaTask
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/login" className={buttonClass("secondary", "sm")}>
            {t("landing.login")}
          </Link>
        </div>
      </header>
      <section className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 sm:py-16 grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-semibold">
            <Icon name="star" className="w-3.5 h-3.5" /> Côte d&apos;Ivoire · FCFA
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">{t("landing.title")}</h1>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">{t("landing.subtitle")}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/register" className={buttonClass("primary", "lg")}>
              {t("landing.cta")} <Icon name="arrowRight" className="w-4 h-4" />
            </Link>
            <Link href="/login" className={buttonClass("secondary", "lg")}>
              {t("landing.login")}
            </Link>
          </div>
        </div>
        <div className="relative order-first md:order-last">
          <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-200 via-emerald-100 to-transparent rounded-[2rem] blur-2xl opacity-70" />
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-xl">
            <Photo src={banner.imageUrl} alt="" priority sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-900/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
              <h2 className="text-lg sm:text-2xl font-extrabold leading-tight drop-shadow">{bannerTitle}</h2>
              <p className="mt-1 max-w-md text-xs sm:text-sm text-emerald-50/90 leading-snug">{bannerText}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-10 grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Icon name={f.icon} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <TelegramFab links={telegram} />
    </main>
  );
}
