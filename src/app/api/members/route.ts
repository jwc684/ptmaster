import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter, requireShopContext } from "@/lib/shop-utils";
import { logApiAction } from "@/lib/access-log";
import { z } from "zod";
import { hasRole, primaryRole } from "@/lib/role-utils";

export async function GET(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can access member list
    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const skip = (page - 1) * limit;

    // Build shop filter
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const where = {
      ...shopFilter,
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: "insensitive" as const } } },
              { user: { email: { contains: search, mode: "insensitive" as const } } },
              { user: { phone: { contains: search } } },
            ],
          }
        : {}),
    };

    const [members, total] = await Promise.all([
      prisma.memberProfile.findMany({
        where,
        select: {
          id: true,
          remainingPT: true,
          joinDate: true,
          trainerId: true,
          shopId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              user: { select: { name: true } },
            },
          },
          shop: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.memberProfile.count({ where }),
    ]);

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "회원 목록을 불러오는 중 오류가 발생했습니다." },
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

    // Only ADMIN and SUPER_ADMIN can create members
    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Require shop context for creating members
    const shopError = requireShopContext(authResult);
    if (shopError) {
      return NextResponse.json({ error: shopError }, { status: 400 });
    }

    const memberInviteSchema = z.object({
      name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다."),
      email: z.string().email("올바른 이메일 주소를 입력해주세요."),
      phone: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.enum(["MALE", "FEMALE"]).optional(),
      trainerId: z.string().optional(),
      remainingPT: z.number().min(0).default(0),
      notes: z.string().optional(),
    });

    const body = await request.json();
    const validatedData = memberInviteSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, birthDate, gender, trainerId, remainingPT, notes } =
      validatedData.data;

    // If trainerId is provided, verify trainer belongs to same shop
    if (trainerId) {
      const trainer = await prisma.trainerProfile.findFirst({
        where: {
          id: trainerId,
          shopId: authResult.shopId!,
        },
      });
      if (!trainer) {
        return NextResponse.json(
          { error: "해당 트레이너를 찾을 수 없습니다." },
          { status: 400 }
        );
      }
    }

    // 초대 토큰 생성
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await prisma.invitation.create({
      data: {
        token,
        email,
        role: "MEMBER",
        shopId: authResult.shopId!,
        metadata: { name, phone, birthDate, gender, trainerId, remainingPT, notes },
        expiresAt,
        createdBy: authResult.userId,
      },
      include: {
        shop: { select: { name: true } },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${token}`;

    // Log the action
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: { name: true },
    });
    const shop = authResult.shopId
      ? await prisma.pTShop.findUnique({
          where: { id: authResult.shopId },
          select: { name: true },
        })
      : null;

    await logApiAction(
      authResult.userId,
      currentUser?.name || "Unknown",
      primaryRole(authResult.userRoles),
      "CREATE",
      "/api/members",
      `회원 초대 생성: ${name}`,
      authResult.shopId,
      shop?.name,
      invitation.id,
      "invitation"
    );

    return NextResponse.json(
      {
        message: "회원 초대가 생성되었습니다.",
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
    console.error("Error creating member:", error);
    return NextResponse.json(
      { error: "회원 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
