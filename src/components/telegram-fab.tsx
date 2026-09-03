"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { cn, Icon } from "./ui";

export type TelegramLinksProp = { support: string; group: string };

export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9.04 15.47 8.7 20.2c.48 0 .69-.21.94-.46l2.26-2.16 4.68 3.43c.86.47 1.47.22 1.7-.79l3.08-14.4c.31-1.28-.46-1.79-1.3-1.47L1.9 11.3c-1.23.48-1.21 1.17-.21 1.48l4.6 1.44 10.7-6.75c.5-.3.96-.14.58.19L9.04 15.47Z" />
    </svg>
  );
}

/**
 * Bouton flottant Telegram : ouvre un petit panneau avec deux liens
 * (service client, groupe officiel). Les liens sont configurés par
 * l'administrateur (/admin/settings) ; un lien vide s'affiche « bientôt ».
 */
export function TelegramFab({ links, aboveBottomNav = false }: { links: TelegramLinksProp; aboveBottomNav?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items = [
    { key: "support", href: links.support, label: t("telegram.support"), hint: t("telegram.supportHint"), icon: "user" as const },
    { key: "group", href: links.group, label: t("telegram.group"), hint: t("telegram.groupHint"), icon: "users" as const },
  ];

  return (
    <>
      {open && <div className="fixed inset-0 z-[44] bg-slate-900/25" onClick={() => setOpen(false)} aria-hidden />}
      <div
        className={cn(
          "fixed right-4 z-[45] flex flex-col items-end gap-3",
          aboveBottomNav ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6" : "bottom-6",
        )}
      >
        {open && (
          <div role="dialog" aria-label={t("telegram.title")} className="w-[18rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-[fadeIn_.15s_ease-out]">
            <div className="flex items-center gap-2 bg-[#229ED9] px-4 py-3 text-white">
              <TelegramIcon className="h-5 w-5" />
              <p className="text-sm font-bold">{t("telegram.title")}</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((it) =>
                it.href ? (
                  <li key={it.key}>
                    <a
                      href={it.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50 active:bg-sky-100"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#229ED9]">
                        <Icon name={it.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{it.label}</span>
                        <span className="block text-xs text-slate-500">{it.hint}</span>
                      </span>
                      <Icon name="arrowRight" className="h-4 w-4 text-slate-400" />
                    </a>
                  </li>
                ) : (
                  <li key={it.key} className="flex items-center gap-3 px-4 py-3 opacity-70">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Icon name={it.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-700">{it.label}</span>
                      <span className="block text-xs text-slate-400">{t("telegram.soon")}</span>
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("telegram.open")}
          aria-expanded={open}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#229ED9] text-white shadow-lg shadow-sky-500/40 transition hover:bg-[#1d8dc4] active:scale-95"
        >
          {!open && <span className="absolute inset-0 rounded-full bg-[#229ED9] opacity-30 animate-ping [animation-duration:2s]" />}
          {open ? <Icon name="x" className="relative h-6 w-6" /> : <TelegramIcon className="relative -ml-0.5 h-7 w-7" />}
        </button>
      </div>
    </>
  );
}
