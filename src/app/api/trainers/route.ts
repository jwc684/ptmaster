import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter, requireShopContext } from "@/lib/shop-utils";
import { z } from "zod";
import { hasRole } from "@/lib/role-utils";

export async function GET() {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can access trainer list
    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Build shop filter
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const trainers = await prisma.trainerProfile.findMany({
      where: shopFilter,
      select: {
        id: true,
        bio: true,
        shopId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        members: {
          select: { id: true },
        },
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(trainers);
  } catch (error) {
    console.error("Error fetching trainers:", error);
    return NextResponse.json(
      { error: "트레이너 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can create trainers
    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Require shop context for creating trainers
    const shopError = requireShopContext(authResult);
    if (shopError) {
      return NextResponse.json({ error: shopError }, { status: 400 });
    }

    const trainerInviteSchema = z.object({
      name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
      email: z.string().email("올바른 이메일 주소를 입력해주세요."),
      phone: z.string().optional(),
      bio: z.string().optional(),
    });

    const body = await request.json();
    const validatedData = trainerInviteSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, bio } = validatedData.data;

    // 초대 토큰 생성
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await prisma.invitation.create({
      data: {
        token,
        email,
        role: "TRAINER",
        shopId: authResult.shopId!,
        metadata: { name, phone, bio },
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
        message: "트레이너 초대가 생성되었습니다.",
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
    console.error("Error creating trainer:", error);
    return NextResponse.json(
      { error: "트레이너 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
