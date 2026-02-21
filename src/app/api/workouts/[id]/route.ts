import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
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
      include: {
        sets: {
          include: {
            exercise: { select: { id: true, name: true, type: true } },
          },
          orderBy: [{ order: "asc" }, { setNumber: "asc" }],
        },
      },
    });

    if (!workout) {
      return NextResponse.json({ error: "운동 기록을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ workout });
  } catch (error) {
    console.error("Error fetching workout:", error);
    return NextResponse.json(
      { error: "운동 기록을 불러오는 중 오류가 발생했습니다." },
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

    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.status === "COMPLETED") {
      updateData.status = "COMPLETED";
      updateData.completedAt = new Date();
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }

    const updated = await prisma.workoutSession.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: body.status === "COMPLETED" ? "운동을 완료했습니다!" : "운동 기록이 수정되었습니다.",
      workout: updated,
    });
  } catch (error) {
    console.error("Error updating workout:", error);
    return NextResponse.json(
      { error: "운동 기록 수정 중 오류가 발생했습니다." },
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

    await prisma.workoutSession.delete({ where: { id } });

    return NextResponse.json({ message: "운동 기록이 삭제되었습니다." });
  } catch (error) {
    console.error("Error deleting workout:", error);
    return NextResponse.json(
      { error: "운동 기록 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
