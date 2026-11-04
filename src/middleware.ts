import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken =
    request.cookies.get("fullgope_auth")?.value === "1" ||
    !!request.cookies.get("fullgope_access_token")?.value;

  // Protected portal routes
  const protectedPrefixes = [
    "/dashboard",
    "/membres",
    "/departements",
    "/finance",
    "/liturgie",
    "/organisation",
    "/rapports",
    "/actualites",
    "/messagerie",
    "/mediatheque",
    "/administration",
  ];

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !hasToken) {
    const loginUrl = new URL("/connexion", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user visits /connexion directly WITHOUT a redirect param and already has a token, redirect to /dashboard.
  // NEVER redirect away from /connexion if a "redirect" query parameter is present!
  // A redirect parameter means the user was rejected or explicitly requested to re-authenticate.
  if (pathname === "/connexion" && hasToken && !request.nextUrl.searchParams.has("redirect")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/membres/:path*",
    "/departements/:path*",
    "/finance/:path*",
    "/liturgie/:path*",
    "/organisation/:path*",
    "/rapports/:path*",
    "/actualites/:path*",
    "/messagerie/:path*",
    "/mediatheque/:path*",
    "/administration/:path*",
    "/connexion",
  ],
};

