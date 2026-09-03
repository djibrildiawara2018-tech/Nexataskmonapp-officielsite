import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { AdminNav, DemoBanner, LanguageSwitcher } from "@/components/client";
import { Icon } from "@/components/ui";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin(); // redirige tout compte non-admin
  const { t } = await getT();
  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-slate-100">
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-slate-900 text-white p-4 gap-6 sticky top-0 h-dvh">
        <Link href="/admin" className="flex items-center gap-2 font-extrabold text-lg">
          <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-sm">N</span>
          NexaTask <span className="text-xs font-semibold text-slate-400">ADMIN</span>
        </Link>
        <AdminNav variant="sidebar" />
        <div className="mt-auto space-y-3 text-sm">
          <p className="text-slate-400 truncate">{admin.email}</p>
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-300 hover:text-white">
            <Icon name="arrowLeft" className="w-4 h-4" /> {t("admin.backToApp")}
          </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        {DEMO_MODE && <DemoBanner compact />}
        <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Icon name="shield" className="w-5 h-5 text-violet-600" /> {t("admin.title")}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/dashboard" className="lg:hidden text-sm font-medium text-emerald-700">
              {t("admin.backToApp")}
            </Link>
          </div>
        </header>
        <AdminNav variant="tabs" />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
