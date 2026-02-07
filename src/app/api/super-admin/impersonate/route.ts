import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop } from "@/lib/shop-utils";
import { logAccess } from "@/lib/access-log";
import { cookies } from "next/headers";

const IMPERSONATE_COOKIE = "impersonate-session";

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

// POST: Start impersonation (set cookie)
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!authResult.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, shopId } = body;

    if (!userId && !shopId) {
      return NextResponse.json(
        { error: "userId or shopId is required" },
        { status: 400 }
      );
    }

    let targetUser;

    if (shopId) {
      targetUser = await prisma.user.findFirst({
        where: { shopId, role: "ADMIN" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          shopId: true,
          shop: { select: { name: true } },
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "해당 PT샵에 등록된 관리자가 없습니다." },
          { status: 404 }
        );
      }
    } else {
      targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          shopId: true,
          shop: { select: { name: true } },
        },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (targetUser.role === "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Cannot impersonate SUPER_ADMIN users" },
          { status: 400 }
        );
      }
    }

    // Create a signed JWT for the impersonation cookie (1 hour expiry)
    const token = await new SignJWT({
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      shopId: targetUser.shopId,
      shopName: targetUser.shop?.name || null,
      superAdminId: authResult.userId,
      purpose: "impersonate",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(getSecret());

    await logAccess({
      userId: authResult.userId,
      userName: "Super Admin",
      userRole: "SUPER_ADMIN",
      shopId: targetUser.shopId,
      shopName: targetUser.shop?.name || null,
      actionType: "API_CALL",
      page: "/super-admin/shops",
      action: `${targetUser.role === "ADMIN" ? "관리자" : "회원"} 계정으로 로그인 (대상: ${targetUser.name} / ${targetUser.email})`,
      targetId: targetUser.id,
      targetType: "user",
      metadata: {
        impersonatedUserId: targetUser.id,
        impersonatedUserEmail: targetUser.email,
        impersonatedUserName: targetUser.name,
      },
    });

    // Set impersonation cookie
    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        shopName: targetUser.shop?.name,
      },
    });
  } catch (error) {
    console.error("Error starting impersonation:", error);
    return NextResponse.json(
      { error: "Failed to start impersonation" },
      { status: 500 }
    );
  }
}

// DELETE: Stop impersonation (clear cookie)
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATE_COOKIE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error stopping impersonation:", error);
    return NextResponse.json(
      { error: "Failed to stop impersonation" },
      { status: 500 }
    );
  }
}
