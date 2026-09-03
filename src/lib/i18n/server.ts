import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createTranslator, dictionaries, type Dictionary, type Translator } from "./index";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";

export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
});

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}

export async function getT(): Promise<{ t: Translator; locale: Locale; dict: Dictionary }> {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return { t: createTranslator(dict), locale, dict };
}
