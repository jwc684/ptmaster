import { NextRequest, NextResponse } from "next/server";
import { getAuthWithShop } from "@/lib/shop-utils";
import { logPageView } from "@/lib/access-log";
import { prisma } from "@/lib/prisma";
import { primaryRole } from "@/lib/role-utils";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const { page } = await request.json();

    if (!page) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Get user name
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: { name: true },
    });

    // Get shop name if shopId exists
    let shopName: string | null = null;
    if (authResult.shopId) {
      const shop = await prisma.pTShop.findUnique({
        where: { id: authResult.shopId },
        select: { name: true },
      });
      shopName = shop?.name || null;
    }

    await logPageView(
      authResult.userId,
      user?.name || "Unknown",
      primaryRole(authResult.userRoles),
      page,
      authResult.shopId,
      shopName
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to log page view:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
