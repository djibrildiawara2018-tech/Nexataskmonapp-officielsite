import { fr } from "./dictionaries/fr";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import type { Locale } from "./config";

export type Dictionary = Record<keyof typeof fr, string>;
export type DictKey = keyof Dictionary;

export const dictionaries: Record<Locale, Dictionary> = { fr, en, es };

export type Translator = (key: DictKey, params?: Record<string, string | number>) => string;

export function createTranslator(dict: Dictionary): Translator {
  return (key, params) => {
    let text: string = dict[key] ?? fr[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.split(`{${k}}`).join(String(v));
      }
    }
    return text;
  };
}

export * from "./config";
