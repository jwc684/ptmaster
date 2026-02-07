import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const IMPERSONATE_COOKIE = "impersonate-session";

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

// GET: Activate impersonation in a new tab — sets cookie and redirects to dashboard
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/super-admin", request.url));
  }

  try {
    // Verify the token is valid
    const { payload } = await jwtVerify(token, getSecret());

    if (payload.purpose !== "impersonate" || !payload.id) {
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }

    // Set impersonation cookie
    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    // Redirect based on impersonated role
    const role = payload.role as string;
    const redirectPath = role === "MEMBER" ? "/my" : "/dashboard";

    return NextResponse.redirect(new URL(redirectPath, request.url));
  } catch {
    // Token invalid or expired
    return NextResponse.redirect(new URL("/super-admin", request.url));
  }
}
