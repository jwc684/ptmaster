import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({
  shopId: z.string().min(1),
  name: z.string().min(1),
});

// POST: Set signup cookies server-side with httpOnly flag
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { shopId, name } = result.data;
    const cookieStore = await cookies();

    cookieStore.set("signup-shop-id", shopId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes (only needs to survive OAuth redirect)
      path: "/",
    });

    cookieStore.set("signup-name", name, {
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
