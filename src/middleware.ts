import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_ACCESS, PUBLIC_ROUTES, PUBLIC_API_ROUTES, DASHBOARD_PATH } from "@/types";
import type { UserRole } from "@/types";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role as UserRole | undefined;

  const pathname = nextUrl.pathname;

  // Check if it's a public API route
  const isPublicApiRoute = PUBLIC_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Check if it's a public route
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Redirect logged-in users away from public routes to their dashboard
  if (isLoggedIn && isPublicRoute) {
    const dashboardPath = userRole ? DASHBOARD_PATH[userRole] : "/dashboard";
    return NextResponse.redirect(new URL(dashboardPath, nextUrl));
  }

  // Redirect non-logged-in users to login
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Super Admin route protection
  if (pathname.startsWith("/super-admin") || pathname.startsWith("/api/super-admin")) {
    if (!isLoggedIn || userRole !== "SUPER_ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dashboardPath = userRole ? DASHBOARD_PATH[userRole] : "/login";
      return NextResponse.redirect(new URL(dashboardPath, nextUrl));
    }
    return NextResponse.next();
  }

  // If Super Admin is impersonating, bypass role-based route check
  // (page-level auth properly resolves the impersonated session via cookie)
  if (isLoggedIn && userRole === "SUPER_ADMIN") {
    const impersonateCookie = req.cookies.get("impersonate-session");
    if (impersonateCookie?.value) {
      return NextResponse.next();
    }
  }

  // Check role-based access for protected routes
  if (isLoggedIn && userRole) {
    const allowedRoutes = ROLE_ACCESS[userRole];
    const isAllowed = allowedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    // Special case for API routes that need role checking
    if (pathname.startsWith("/api/") && !isPublicApiRoute) {
      // Let the API route handle its own authorization
      return NextResponse.next();
    }

    if (!isAllowed && !isPublicRoute) {
      // Redirect to appropriate dashboard if access denied
      const dashboardPath = DASHBOARD_PATH[userRole];
      return NextResponse.redirect(new URL(dashboardPath, nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
