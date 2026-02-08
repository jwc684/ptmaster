import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
});

// POST: Set invite cookies server-side with httpOnly flag
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { token, name } = result.data;
    const cookieStore = await cookies();

    cookieStore.set("invite-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes (only needs to survive OAuth redirect)
      path: "/",
    });

    cookieStore.set("invite-name", name, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to set cookies" }, { status: 500 });
  }
}
