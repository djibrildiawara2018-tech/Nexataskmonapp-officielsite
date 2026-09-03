import type { ReactNode } from "react";
import { requireUser, isAdmin } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/config";
import { getUnreadCount } from "@/lib/queries/user";
import { BottomNav, DemoBanner, TopNav } from "@/components/client";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const unread = await getUnreadCount(user.id);
  return (
    <div className="min-h-dvh flex flex-col">
      {DEMO_MODE && <DemoBanner compact />}
      <TopNav isAdmin={isAdmin(user)} unread={unread} />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
