import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthWithShop, requireShopContext } from "@/lib/shop-utils";
import { z } from "zod";
import { hasRole } from "@/lib/role-utils";

const createInvitationSchema = z.object({
  role: z.enum(["ADMIN", "TRAINER", "MEMBER"]),
  email: z.string().email().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// POST: 초대 생성
export async function POST(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // ADMIN, SUPER_ADMIN, 또는 TRAINER만 초대 생성 가능
    if (!hasRole(authResult.userRoles, "ADMIN", "TRAINER", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Shop context 필수
    const shopError = requireShopContext(authResult);
    if (shopError) {
      return NextResponse.json({ error: shopError }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createInvitationSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    let { role, email, metadata } = validatedData.data;

    // ADMIN 역할 초대는 SUPER_ADMIN만 가능
    if (role === "ADMIN" && !authResult.isSuperAdmin) {
      return NextResponse.json({ error: "슈퍼관리자만 관리자를 초대할 수 있습니다." }, { status: 403 });
    }

    // TRAINER는 MEMBER 초대만 생성 가능, trainerId 자동 주입 (ADMIN 우선: ADMIN+TRAINER 복합 역할은 제한 없음)
    if (hasRole(authResult.userRoles, "TRAINER") && !hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      if (role !== "MEMBER") {
        return NextResponse.json({ error: "트레이너는 회원만 초대할 수 있습니다." }, { status: 403 });
      }

      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: authResult.userId },
        select: { id: true },
      });

      if (!trainerProfile) {
        return NextResponse.json({ error: "트레이너 프로필을 찾을 수 없습니다." }, { status: 403 });
      }

      metadata = { ...(metadata || {}), trainerId: trainerProfile.id };
    }

    // 트레이너가 생성하는 MEMBER 초대는 reusable (ADMIN+TRAINER 복합 역할은 ADMIN으로 처리)
    const isReusable = hasRole(authResult.userRoles, "TRAINER") && !hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN") && role === "MEMBER";

    // 토큰 생성
    const token = crypto.randomUUID();

    // reusable은 1년, 일반은 30일 만료
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isReusable ? 365 : 30));

    // 초대 생성
    const invitation = await prisma.invitation.create({
      data: {
        token,
        email,
        role,
        shopId: authResult.shopId!,
        metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        reusable: isReusable,
        expiresAt,
        createdBy: authResult.userId,
      },
      include: {
        shop: {
          select: { name: true },
        },
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
          createdAt: invitation.createdAt,
        },
        inviteUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "초대 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// GET: 샵별 초대 목록 조회
export async function GET() {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const shopError = requireShopContext(authResult);
    if (shopError) {
      return NextResponse.json({ error: shopError }, { status: 400 });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        shopId: authResult.shopId!,
      },
      include: {
        shop: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "초대 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
