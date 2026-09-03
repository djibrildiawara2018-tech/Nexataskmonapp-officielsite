export const locales = ["fr", "en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const LOCALE_COOKIE = "nx_locale";

export const localeLabels: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

const intlLocale: Record<Locale, string> = { fr: "fr-FR", en: "en-US", es: "es-ES" };

/** Formate un montant en FCFA (XOF, sans décimales). */
export function formatMoney(amount: number, locale: Locale = "fr"): string {
  const n = new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 0 }).format(
    Math.round(amount || 0),
  );
  return `${n} FCFA`;
}

export function formatDate(value: Date | string | null | undefined, locale: Locale = "fr"): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: Date | string | null | undefined, locale: Locale = "fr"): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
