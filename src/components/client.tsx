"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { setLocaleAction } from "@/lib/actions/auth";
import { localeLabels, locales } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n";
import { Alert, Badge, Button, buttonClass, cn, Icon, Spinner, statusTone, type ButtonVariant } from "./ui";

/* ------------------------------ Soumission avec loader ------------------------------ */
export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending || props.disabled} {...props}>
      {pending && <Spinner className="w-4 h-4" />}
      {children}
    </Button>
  );
}

/* ------------------------------ Formulaire avec confirmation ------------------------------ */
export function ConfirmForm({
  action,
  confirmMessage,
  children,
  className,
}: {
  action: (fd: FormData) => void | Promise<void>;
  confirmMessage: string;
  children: ReactNode;
  className?: string;
}) {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!window.confirm(confirmMessage)) e.preventDefault();
  };
  return (
    <form action={action} onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
}

/* ------------------------------ Messages traduits ------------------------------ */
export function T({ k, params }: { k: DictKey | string; params?: Record<string, string | number> }) {
  const { t } = useI18n();
  return <>{t(k as DictKey, params)}</>;
}

export function ActionAlert({ state }: { state: { error?: string; success?: string } | null }) {
  const { t } = useI18n();
  if (!state) return null;
  if (state.error) return <Alert tone="error">{t(state.error as DictKey)}</Alert>;
  if (state.success) return <Alert tone="success">{t(state.success as DictKey)}</Alert>;
  return null;
}

/** Affiche un message flash à partir de ?msg=clé (clé i18n "flash.*"). */
export function FlashMessage() {
  const sp = useSearchParams();
  const { t, dict } = useI18n();
  const [visible, setVisible] = useState(true);
  const msg = sp.get("msg");
  useEffect(() => {
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(id);
  }, [msg]);
  if (!msg || !visible) return null;
  const key = msg === "error" ? "common.error" : msg === "forbidden" ? "admin.forbidden" : (`flash.${msg}` as DictKey);
  if (!(key in dict)) return null;
  const tone = msg === "error" || msg === "forbidden" || msg === "disabled" ? "error" : "success";
  return (
    <div className="fixed top-3 inset-x-3 z-50 sm:inset-x-auto sm:right-4 sm:w-96 animate-[fadeIn_.2s_ease-out]">
      <div
        className={cn(
          "rounded-xl px-4 py-3 text-sm font-medium shadow-lg flex items-center gap-2",
          tone === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white",
        )}
      >
        <Icon name={tone === "error" ? "x" : "check"} className="w-4 h-4" />
        <span className="flex-1">{t(key)}</span>
        <button onClick={() => setVisible(false)} aria-label="close" className="opacity-80">
          <Icon name="x" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Badge de statut traduit ------------------------------ */
export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <Badge tone={statusTone(status)}>{t(`status.${status}` as DictKey)}</Badge>;
}

/* ------------------------------ Bannière mode démo ------------------------------ */
export function DemoBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn("bg-amber-400 text-amber-950 text-center font-semibold", compact ? "text-[11px] py-1 px-3" : "text-xs py-1.5 px-3")}>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-900 animate-pulse" />
        {compact ? t("common.demoMode") : t("common.demoBanner")}
      </span>
    </div>
  );
}

/* ------------------------------ Copier ------------------------------ */
export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cn(buttonClass("subtle", "sm"), className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
    >
      <Icon name={copied ? "check" : "copy"} className="w-4 h-4" />
      {copied ? t("common.copied") : (label ?? t("common.copy"))}
    </button>
  );
}

export function ShareButton({ text, className }: { text: string; className?: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={cn(buttonClass("primary", "sm"), className)}
      onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ text });
          else {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }
        } catch {
          /* ignore */
        }
      }}
    >
      <Icon name="share" className="w-4 h-4" />
      {done ? t("common.copied") : t("team.share")}
    </button>
  );
}

/* ------------------------------ Sélecteur de langue ------------------------------ */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  return (
    <form action={setLocaleAction} className={cn("inline-flex items-center gap-2", className)}>
      <input type="hidden" name="back" value={pathname} />
      <Icon name="globe" className="w-4 h-4 text-slate-500" />
      <select
        name="locale"
        defaultValue={locale}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Language"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </form>
  );
}

/* ------------------------------ Navigation utilisateur ------------------------------ */
const NAV = [
  { href: "/dashboard", key: "nav.home", icon: "home" },
  { href: "/products", key: "nav.products", icon: "box" },
  { href: "/team", key: "nav.team", icon: "users" },
  { href: "/me", key: "nav.me", icon: "user" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 md:hidden pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-emerald-600" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <span className={cn("rounded-xl px-3 py-1", active && "bg-emerald-50")}>
                  <Icon name={item.icon} className="w-5 h-5" />
                </span>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopNav({ isAdmin, unread }: { isAdmin: boolean; unread: number }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-emerald-700 text-lg">
          <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm">N</span>
          NexaTask
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium",
                  active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {t(item.key)}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin" className="px-3 py-2 rounded-lg text-sm font-medium text-violet-700 hover:bg-violet-50">
              {t("nav.admin")}
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/admin" className="md:hidden text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1.5 rounded-lg">
              {t("nav.admin")}
            </Link>
          )}
          <Link href="/me/notifications" className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Notifications">
            <Icon name="bell" className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------ Admin nav ------------------------------ */
const ADMIN_NAV = [
  { href: "/admin", key: "admin.dashboard", icon: "chart" },
  { href: "/admin/users", key: "admin.users", icon: "users" },
  { href: "/admin/products", key: "admin.products", icon: "box" },
  { href: "/admin/payments", key: "admin.payments", icon: "card" },
  { href: "/admin/withdrawals", key: "admin.withdrawals", icon: "wallet" },
  { href: "/admin/audit", key: "admin.audit", icon: "list" },
  { href: "/admin/settings", key: "admin.settings", icon: "settings" },
] as const;

export function AdminNav({ variant }: { variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  if (variant === "tabs") {
    return (
      <nav className="lg:hidden overflow-x-auto border-b border-slate-200 bg-white">
        <ul className="flex gap-1 px-3 py-2 min-w-max">
          {ADMIN_NAV.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
                  isActive(i.href) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon name={i.icon} className="w-4 h-4" />
                {t(i.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <nav className="space-y-1">
      {ADMIN_NAV.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
            isActive(i.href) ? "bg-slate-900 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
          )}
        >
          <Icon name={i.icon} className="w-5 h-5" />
          {t(i.key)}
        </Link>
      ))}
    </nav>
  );
}

/* ------------------------------ Auto-refresh (checkout en attente) ------------------------------ */
export function AutoRefresh({ intervalMs = 5000, enabled }: { intervalMs?: number; enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, router]);
  return null;
}
