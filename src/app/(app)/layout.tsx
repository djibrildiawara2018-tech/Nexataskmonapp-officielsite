import type { ReactNode } from "react";
import { requireUser, isAdmin } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/config";
import { getUnreadCount } from "@/lib/queries/user";
import { isMaintenanceMode } from "@/lib/services/system";
import { getT } from "@/lib/i18n/server";
import { BottomNav, DemoBanner, TopNav } from "@/components/client";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const admin = isAdmin(user);
  const maintenance = await isMaintenanceMode();

  if (maintenance && !admin) {
    const { t } = await getT();
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-3">
        <h1 className="text-xl font-bold">{t("maintenance.title")}</h1>
        <p className="text-slate-500 max-w-md">{t("maintenance.message")}</p>
      </div>
    );
  }

  const unread = await getUnreadCount(user.id);
  return (
    <div className="min-h-dvh flex flex-col">
      {DEMO_MODE && <DemoBanner compact />}
      <TopNav isAdmin={admin} unread={unread} />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
