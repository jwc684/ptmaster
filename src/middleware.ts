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
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Detect invalidated session (user was deleted from DB)
  if (isLoggedIn && !userRole) {
    if (!isPublicRoute && !isPublicApiRoute) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL("/login", nextUrl));
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("__Secure-authjs.session-token");
      return response;
    }
    // On public routes, let them through (show login page)
    return NextResponse.next();
  }

  // Redirect logged-in users away from public routes to their dashboard
  // Exception: MEMBER without shopId (JWT) needs to stay on signup pages to complete registration
  if (isLoggedIn && isPublicRoute) {
    const memberPendingSignup = userRole === "MEMBER" && !req.auth?.user?.shopId;
    if (memberPendingSignup && pathname.startsWith("/signup")) {
      return NextResponse.next();
    }
    const dashboardPath = userRole ? DASHBOARD_PATH[userRole] : "/dashboard";
    return NextResponse.redirect(new URL(dashboardPath, nextUrl));
  }

  // Redirect non-logged-in users to login
  if (!isLoggedIn && !isPublicRoute) {
    const isSuperAdminRoute = pathname.startsWith("/super-admin") || pathname === "/admin" || pathname.startsWith("/admin/");
    const loginUrl = new URL(isSuperAdminRoute ? "/admin/login" : "/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Super Admin route protection
  if (pathname.startsWith("/super-admin") || pathname.startsWith("/api/super-admin")) {
    // Allow DELETE to impersonate endpoint when impersonating (cookie still present, real role is SUPER_ADMIN)
    const impersonateCookie = req.cookies.get("impersonate-session");
    const isStopImpersonate = pathname === "/api/super-admin/impersonate" && req.method === "DELETE" && impersonateCookie?.value;

    if (!isLoggedIn || (userRole !== "SUPER_ADMIN" && !isStopImpersonate)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dashboardPath = userRole ? DASHBOARD_PATH[userRole] : "/login";
      return NextResponse.redirect(new URL(dashboardPath, nextUrl));
    }
    return NextResponse.next();
  }

  // If impersonation cookie exists, the real user is SUPER_ADMIN — bypass role-based route check.
  // The session callback overrides userRole to the impersonated role, so we check the cookie directly.
  if (isLoggedIn) {
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
