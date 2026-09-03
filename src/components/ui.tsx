import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------ Utilitaires ------------------------------ */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------ Boutons ------------------------------ */
const variants = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/20",
  secondary: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
  ghost: "bg-transparent text-emerald-700 hover:bg-emerald-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
  subtle: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
} as const;
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-5 text-base" } as const;

export type ButtonVariant = keyof typeof variants;

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof sizes = "md", extra = "") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof sizes }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof sizes }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ------------------------------ Cartes ------------------------------ */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl bg-white border border-slate-200/80 shadow-sm", className)}>{children}</div>;
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "emerald" | "amber" | "sky" | "rose";
  icon?: ReactNode;
}) {
  const tones = {
    default: "bg-white border-slate-200/80",
    emerald: "bg-emerald-50 border-emerald-100",
    amber: "bg-amber-50 border-amber-100",
    sky: "bg-sky-50 border-sky-100",
    rose: "bg-rose-50 border-rose-100",
  };
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className="text-xl font-extrabold text-slate-900 mt-1 break-words">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

/* ------------------------------ Badges ------------------------------ */
const badgeTones = {
  slate: "bg-slate-100 text-slate-700",
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
  sky: "bg-sky-100 text-sky-800",
  violet: "bg-violet-100 text-violet-800",
} as const;

export function Badge({ tone = "slate", children, className }: { tone?: keyof typeof badgeTones; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function statusTone(status: string): keyof typeof badgeTones {
  switch (status) {
    case "paid":
    case "active":
    case "completed":
    case "approved":
      return "emerald";
    case "pending":
      return "amber";
    case "failed":
    case "rejected":
    case "disabled":
      return "rose";
    case "cancelled":
      return "slate";
    default:
      return "slate";
  }
}

/* ------------------------------ Formulaires ------------------------------ */
export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(inputClass, "h-auto min-h-[96px] py-2.5", props.className)} />;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "success" | "error" | "warning"; children: ReactNode }) {
  const tones = {
    info: "bg-sky-50 text-sky-900 border-sky-200",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-rose-50 text-rose-900 border-rose-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200",
  };
  return <div className={cn("rounded-xl border px-3.5 py-2.5 text-sm", tones[tone])}>{children}</div>;
}

/* ------------------------------ États ------------------------------ */
export function EmptyState({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        {icon ?? <Icon name="inbox" className="w-6 h-6" />}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin h-5 w-5", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/* ------------------------------ Pagination ------------------------------ */
export function Pagination({
  page,
  totalPages,
  basePath,
  params,
  labels,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
  labels: { prev: string; next: string; page: string };
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClass("secondary", "sm")}>
          ‹ {labels.prev}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-slate-500">{labels.page}</span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={buttonClass("secondary", "sm")}>
          {labels.next} ›
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

/* ------------------------------ Icônes (SVG inline) ------------------------------ */
const paths: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z",
  box: "M21 8.25 12 3 3 8.25v7.5L12 21l9-5.25v-7.5ZM12 12l9-5.25M12 12v9M12 12 3 6.75",
  users: "M16 19a4 4 0 0 0-8 0M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 7a3 3 0 0 0-3-3m-8 0a3 3 0 0 0-3 3M18 11a2.5 2.5 0 1 0 0-5M6 11a2.5 2.5 0 1 1 0-5",
  user: "M17 20a5 5 0 0 0-10 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  wallet: "M3 7a2 2 0 0 1 2-2h13v3H5a2 2 0 0 1-2-1Zm0 0v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2Zm13 5h3",
  bell: "M15 17H9m6 0h4l-1.4-1.9A2 2 0 0 1 17 14V11a5 5 0 0 0-10 0v3a2 2 0 0 1-.6 1.1L5 17h4m6 0a3 3 0 1 1-6 0",
  gift: "M20 12v8H4v-8m16-4H4v4h16V8ZM12 8v12m0-12H8.5a2 2 0 1 1 0-4C11 4 12 8 12 8Zm0 0h3.5a2 2 0 1 0 0-4C13 4 12 8 12 8Z",
  trend: "M3 17l6-6 4 4 8-8m0 0h-5m5 0v5",
  arrowRight: "M5 12h14m-6-6 6 6-6 6",
  arrowLeft: "M19 12H5m6 6-6-6 6-6",
  check: "M5 13l4 4L19 7",
  x: "M6 6l12 12M6 18 18 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Zm-3 9 2 2 4-4",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.8 3H9.2l-.4 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h5.6l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z",
  inbox: "M3 13h5l2 3h4l2-3h5M5 6h14l2 7v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5l2-7Z",
  copy: "M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2M6 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4m4-4v13",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  card: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 3h18M7 15h4",
  clock: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  logout: "M15 17l5-5-5-5m5 5H9m0 9H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.5 3.5-5.5 3.5-9S14.5 5.5 12 3m0 18c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3M3 12h18",
  search: "M21 21l-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  plus: "M12 5v14m-7-7h14",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z",
  menu: "M4 6h16M4 12h16M4 18h16",
};

export function Icon({ name, className }: { name: keyof typeof paths | string; className?: string }) {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths[name] ?? paths.box} />
    </svg>
  );
}

export function Money({ value, className }: { value: string; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{value}</span>;
}
