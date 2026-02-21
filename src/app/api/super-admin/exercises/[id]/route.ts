import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop } from "@/lib/shop-utils";
import { z } from "zod";

const updateExerciseSchema = z.object({
  name: z.string().min(1, "운동 이름을 입력해주세요.").max(100).optional(),
  type: z.enum(["WEIGHT", "CARDIO", "BODYWEIGHT"]).optional(),
  category: z.string().min(1).optional(),
  equipment: z.string().min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (authResult.userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateExerciseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return NextResponse.json({ error: "운동을 찾을 수 없습니다." }, { status: 404 });
    }

    // Check name duplicate if name is being changed
    if (result.data.name && result.data.name !== exercise.name) {
      const dup = await prisma.exercise.findFirst({
        where: { name: result.data.name, isSystem: true, id: { not: id } },
      });
      if (dup) {
        return NextResponse.json(
          { error: "이미 존재하는 운동 이름입니다." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.exercise.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json({ message: "운동이 수정되었습니다.", exercise: updated });
  } catch (error) {
    console.error("Error updating exercise:", error);
    return NextResponse.json(
      { error: "운동 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (authResult.userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;

    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return NextResponse.json({ error: "운동을 찾을 수 없습니다." }, { status: 404 });
    }

    // Check if exercise has workout sets
    const setCount = await prisma.workoutSet.count({
      where: { exerciseId: id },
    });

    if (setCount > 0) {
      return NextResponse.json(
        { error: `이 운동에 ${setCount}개의 기록이 있어 삭제할 수 없습니다.` },
        { status: 400 }
      );
    }

    await prisma.exercise.delete({ where: { id } });

    return NextResponse.json({ message: "운동이 삭제되었습니다." });
  } catch (error) {
    console.error("Error deleting exercise:", error);
    return NextResponse.json(
      { error: "운동 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
