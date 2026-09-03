import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { ensureSeeded } from "@/lib/services/system";
import { FlashMessage } from "@/components/client";

export const metadata: Metadata = {
  title: { default: "NexaTask", template: "%s · NexaTask" },
  description: "NexaTask — produits, bonus quotidiens et parrainage.",
  applicationName: "NexaTask",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  const { locale, dict } = await getT();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">
        <I18nProvider locale={locale} dict={dict}>
          <Suspense fallback={null}>
            <FlashMessage />
          </Suspense>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
