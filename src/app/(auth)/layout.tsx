import Link from "next/link";
import type { ReactNode } from "react";
import { DEMO_MODE } from "@/lib/config";
import { DemoBanner, LanguageSwitcher } from "@/components/client";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col bg-gradient-to-b from-emerald-50 to-slate-50">
      {DEMO_MODE && <DemoBanner />}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-emerald-700 text-2xl mb-6">
          <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-lg shadow-emerald-600/30">
            N
          </span>
          NexaTask
        </Link>
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 p-6 sm:p-8">{children}</div>
        <div className="mt-6">
          <LanguageSwitcher />
        </div>
      </div>
    </main>
  );
}
