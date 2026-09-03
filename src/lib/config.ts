/** Interrupteur global : true = aucun argent réel (paiements & retraits simulés). */
export const DEMO_MODE = process.env.DEMO_MODE !== "false";

export const APP_NAME = "NexaTask";
export const CURRENCY = "XOF";
export const MIN_WITHDRAWAL = 1000; // FCFA
export const PAGE_SIZE = 20;
export const SESSION_DAYS = 30;

/** Taux de commission de parrainage par niveau (calculés côté serveur). */
export const REFERRAL_RATES: Record<1 | 2 | 3, number> = { 1: 10, 2: 5, 3: 2 };

export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
