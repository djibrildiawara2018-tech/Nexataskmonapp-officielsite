import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "nx_session";
const PRIVATE_PREFIXES = ["/dashboard", "/products", "/team", "/me", "/checkout", "/admin"];

/**
 * Première barrière (redirections rapides). La vérification réelle de la session
 * et du rôle est TOUJOURS refaite côté serveur dans les layouts / actions
 * (requireUser / requireAdmin).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;

  if (!hasSession && PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
};
