import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST: Set signup-flow cookie to indicate direct signup
export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set("signup-flow", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes (only needs to survive OAuth redirect)
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to set cookie" }, { status: 500 });
  }
}
