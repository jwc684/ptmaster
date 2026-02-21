import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop } from "@/lib/shop-utils";
import { z } from "zod";
import { hasRole } from "@/lib/role-utils";

export async function GET(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!hasRole(authResult.userRoles, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const equipment = searchParams.get("equipment") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isSystem: true };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (category) {
      where.category = category;
    }
    if (equipment) {
      where.equipment = equipment;
    }

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          type: true,
          category: true,
          equipment: true,
          isSystem: true,
          createdAt: true,
        },
      }),
      prisma.exercise.count({ where }),
    ]);

    // Get unique categories and equipment for filters
    const [categories, equipments] = await Promise.all([
      prisma.exercise.findMany({
        where: { isSystem: true, category: { not: null } },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
      prisma.exercise.findMany({
        where: { isSystem: true, equipment: { not: null } },
        select: { equipment: true },
        distinct: ["equipment"],
        orderBy: { equipment: "asc" },
      }),
    ]);

    return NextResponse.json({
      exercises,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      filters: {
        categories: categories.map((c) => c.category).filter(Boolean),
        equipments: equipments.map((e) => e.equipment).filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return NextResponse.json(
      { error: "운동 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

const createExerciseSchema = z.object({
  name: z.string().min(1, "운동 이름을 입력해주세요.").max(100),
  type: z.enum(["WEIGHT", "CARDIO", "BODYWEIGHT"]),
  category: z.string().min(1, "카테고리를 선택해주세요."),
  equipment: z.string().min(1, "도구를 선택해주세요."),
});

export async function POST(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!hasRole(authResult.userRoles, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const result = createExerciseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, type, category, equipment } = result.data;

    // Check duplicate
    const existing = await prisma.exercise.findFirst({
      where: { name, isSystem: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 시스템 운동입니다." },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        type,
        category,
        equipment,
        isSystem: true,
      },
    });

    return NextResponse.json(
      { message: "운동이 추가되었습니다.", exercise },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating exercise:", error);
    return NextResponse.json(
      { error: "운동 추가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
