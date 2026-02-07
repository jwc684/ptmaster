import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthWithShop, requireShopContext } from "@/lib/shop-utils";
import { z } from "zod";

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

    // ADMIN 또는 SUPER_ADMIN만 초대 생성 가능
    if (authResult.userRole !== "ADMIN" && !authResult.isSuperAdmin) {
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

    const { role, email, metadata } = validatedData.data;

    // 토큰 생성
    const token = crypto.randomUUID();

    // 30일 만료
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 초대 생성
    const invitation = await prisma.invitation.create({
      data: {
        token,
        email,
        role,
        shopId: authResult.shopId!,
        metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
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

    if (authResult.userRole !== "ADMIN" && !authResult.isSuperAdmin) {
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
