import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter, requireShopContext } from "@/lib/shop-utils";
import { z } from "zod";

const createAdminSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 주소를 입력해주세요.").optional(),
});

// GET: 관리자 목록 조회
export async function GET() {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (authResult.userRole !== "ADMIN" && !authResult.isSuperAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Shop context 확인 (ADMIN은 필수, SUPER_ADMIN은 선택적)
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        ...shopFilter,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        shopId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "관리자 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: 새 관리자 생성
export async function POST(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (authResult.userRole !== "ADMIN" && !authResult.isSuperAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Shop context 필수
    const shopError = requireShopContext(authResult);
    if (shopError) {
      return NextResponse.json({ error: shopError }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createAdminSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email } = validatedData.data;

    // 초대 토큰 생성
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await prisma.invitation.create({
      data: {
        token,
        email,
        role: "ADMIN",
        shopId: authResult.shopId!,
        metadata: { name },
        expiresAt,
        createdBy: authResult.userId,
      },
      include: {
        shop: { select: { name: true } },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          token: invitation.token,
          role: invitation.role,
          email: invitation.email,
          shopName: invitation.shop.name,
          expiresAt: invitation.expiresAt,
        },
        inviteUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "관리자 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
