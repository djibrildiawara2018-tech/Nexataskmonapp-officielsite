import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Déconnexion via route handler (utilisée notamment pour les comptes désactivés). */
export async function GET(req: Request) {
  await destroySession();
  const reason = new URL(req.url).searchParams.get("reason");
  const target = new URL(reason === "disabled" ? "/login?error=disabled" : "/login?msg=logged_out", appUrl());
  // Conserver l'hôte de la requête (proxy / preview)
  const reqUrl = new URL(req.url);
  target.protocol = reqUrl.protocol;
  target.host = reqUrl.host;
  return NextResponse.redirect(target);
}
