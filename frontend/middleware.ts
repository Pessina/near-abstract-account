import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const hasSession =
    request.cookies.has("NEAR_ABSTRACT_ACCOUNT_SESSION") ||
    request.headers.get("x-has-session") === "true";
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublicRoute) {
    const accountUrl = new URL("/account", request.url);
    return NextResponse.redirect(accountUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
