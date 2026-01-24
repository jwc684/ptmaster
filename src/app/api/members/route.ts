import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { memberSchema } from "@/lib/validations/member";
import { getAuthWithShop, buildShopFilter, requireShopContext } from "@/lib/shop-utils";

function generateQRCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can access member list
    if (!["ADMIN", "SUPER_ADMIN"].includes(authResult.userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
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
    if (!["ADMIN", "SUPER_ADMIN"].includes(authResult.userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Require shop context for creating members
    const shopError = requireShopContext(authResult);
    if (shopError) {
      return NextResponse.json({ error: shopError }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = memberSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password, birthDate, gender, trainerId, remainingPT, notes } =
      validatedData.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 400 }
      );
    }

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

    // Hash password
    const hashedPassword = password
      ? await bcrypt.hash(password, 12)
      : await bcrypt.hash("temp1234", 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "MEMBER",
        shopId: authResult.shopId!,
        memberProfile: {
          create: {
            shopId: authResult.shopId!,
            qrCode: generateQRCode(),
            trainerId: trainerId || null,
            remainingPT: remainingPT || 0,
            notes,
            birthDate: birthDate ? new Date(birthDate) : null,
            gender: gender || null,
          },
        },
      },
      include: {
        memberProfile: true,
      },
    });

    return NextResponse.json(
      {
        message: "회원이 등록되었습니다.",
        member: user,
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
