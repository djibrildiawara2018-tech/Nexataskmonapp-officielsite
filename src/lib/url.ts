import "server-only";
import { headers } from "next/headers";
import { appUrl } from "./config";

/** URL de base déduite de la requête (proxy/preview), sinon NEXT_PUBLIC_APP_URL. */
export async function getBaseUrl(): Promise<string> {
  // En production, on privilégie toujours l'URL stable du domaine principal
  // pour que les liens partagés (parrainage, paiement) restent valides
  // même si l'utilisateur consulte le site via une URL de déploiement précise.
  if (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL) {
    return appUrl();
  }
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return appUrl();
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return appUrl();
  }
}
