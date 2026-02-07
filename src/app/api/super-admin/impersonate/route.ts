import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop } from "@/lib/shop-utils";
import { logAccess } from "@/lib/access-log";

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
      // Find the first admin of the shop
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
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      if (targetUser.role === "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Cannot impersonate SUPER_ADMIN users" },
          { status: 400 }
        );
      }
    }

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

    const impersonateToken = await new SignJWT({
      targetUserId: targetUser.id,
      superAdminId: authResult.userId,
      purpose: "impersonate",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30s")
      .sign(secret);

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

    return NextResponse.json({ token: impersonateToken });
  } catch (error) {
    console.error("Error creating impersonation token:", error);
    return NextResponse.json(
      { error: "Failed to create impersonation token" },
      { status: 500 }
    );
  }
}
