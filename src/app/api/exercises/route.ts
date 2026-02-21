import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createExerciseSchema } from "@/lib/validations/workout";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where = {
      AND: [
        // System exercises OR user's custom exercises
        {
          OR: [
            { isSystem: true },
            { createdById: session.user.id },
          ],
        },
        ...(type ? [{ type: type as "WEIGHT" | "CARDIO" | "BODYWEIGHT" }] : []),
      ],
    };

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: [{ isSystem: "desc" }, { category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        equipment: true,
        isSystem: true,
      },
    });

    return NextResponse.json({ exercises });
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return NextResponse.json(
      { error: "운동 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createExerciseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, type } = result.data;

    // Check duplicate for this user
    const existing = await prisma.exercise.findFirst({
      where: {
        name,
        OR: [{ isSystem: true }, { createdById: session.user.id }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 운동입니다." },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        type,
        isSystem: false,
        createdById: session.user.id,
        shopId: session.user.shopId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        equipment: true,
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
