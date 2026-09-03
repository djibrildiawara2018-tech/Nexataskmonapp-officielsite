"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator, type Dictionary, type Translator } from "./index";
import { formatDate, formatDateTime, formatMoney, type Locale } from "./config";

type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: Translator;
  money: (n: number) => string;
  date: (d: Date | string | null | undefined) => string;
  dateTime: (d: Date | string | null | undefined) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dict,
      t: createTranslator(dict),
      money: (n) => formatMoney(n, locale),
      date: (d) => formatDate(d, locale),
      dateTime: (d) => formatDateTime(d, locale),
    }),
    [locale, dict],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
