import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createSetSchema, createSetsSchema, updateSetSchema } from "@/lib/validations/workout";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!memberProfile) {
      return NextResponse.json({ error: "회원 프로필이 없습니다." }, { status: 404 });
    }

    const workout = await prisma.workoutSession.findFirst({
      where: { id, memberProfileId: memberProfile.id },
    });

    if (!workout) {
      return NextResponse.json({ error: "운동 기록을 찾을 수 없습니다." }, { status: 404 });
    }

    if (workout.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "진행 중인 운동에만 세트를 추가할 수 있습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Support both single set and bulk sets
    if (body.sets) {
      const result = createSetsSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const created = await prisma.workoutSet.createMany({
        data: result.data.sets.map((s) => ({
          workoutSessionId: id,
          exerciseId: s.exerciseId,
          setNumber: s.setNumber,
          order: s.order ?? 0,
          weight: s.weight,
          reps: s.reps,
          durationMinutes: s.durationMinutes,
          isCompleted: s.isCompleted ?? false,
        })),
      });

      return NextResponse.json(
        { message: `${created.count}개 세트가 추가되었습니다.` },
        { status: 201 }
      );
    } else {
      const result = createSetSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const set = await prisma.workoutSet.create({
        data: {
          workoutSessionId: id,
          exerciseId: result.data.exerciseId,
          setNumber: result.data.setNumber,
          order: result.data.order ?? 0,
          weight: result.data.weight,
          reps: result.data.reps,
          durationMinutes: result.data.durationMinutes,
          isCompleted: result.data.isCompleted ?? false,
        },
        include: {
          exercise: { select: { id: true, name: true, type: true } },
        },
      });

      return NextResponse.json(
        { message: "세트가 추가되었습니다.", set },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error adding sets:", error);
    return NextResponse.json(
      { error: "세트 추가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get("setId");

    if (!setId) {
      return NextResponse.json({ error: "setId가 필요합니다." }, { status: 400 });
    }

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!memberProfile) {
      return NextResponse.json({ error: "회원 프로필이 없습니다." }, { status: 404 });
    }

    const body = await request.json();
    const result = updateSetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify ownership through workout session
    const set = await prisma.workoutSet.findFirst({
      where: {
        id: setId,
        workoutSessionId: id,
        workoutSession: { memberProfileId: memberProfile.id },
      },
    });

    if (!set) {
      return NextResponse.json({ error: "세트를 찾을 수 없습니다." }, { status: 404 });
    }

    const updated = await prisma.workoutSet.update({
      where: { id: setId },
      data: { isCompleted: result.data.isCompleted },
    });

    return NextResponse.json({ message: "세트가 업데이트되었습니다.", set: updated });
  } catch (error) {
    console.error("Error updating set:", error);
    return NextResponse.json(
      { error: "세트 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get("setId");

    if (!setId) {
      return NextResponse.json({ error: "setId가 필요합니다." }, { status: 400 });
    }

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!memberProfile) {
      return NextResponse.json({ error: "회원 프로필이 없습니다." }, { status: 404 });
    }

    // Verify ownership through workout session
    const set = await prisma.workoutSet.findFirst({
      where: {
        id: setId,
        workoutSessionId: id,
        workoutSession: { memberProfileId: memberProfile.id },
      },
    });

    if (!set) {
      return NextResponse.json({ error: "세트를 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.workoutSet.delete({ where: { id: setId } });

    return NextResponse.json({ message: "세트가 삭제되었습니다." });
  } catch (error) {
    console.error("Error deleting set:", error);
    return NextResponse.json(
      { error: "세트 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
