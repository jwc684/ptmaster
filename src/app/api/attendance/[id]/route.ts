import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateAttendanceSchema = z.object({
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

// GET: 단일 출석 기록 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      select: {
        id: true,
        checkInTime: true,
        remainingPTAfter: true,
        notes: true,
        internalNotes: session.user.role !== "MEMBER" ? true : false,
        memberProfile: {
          select: {
            id: true,
            userId: true,
            remainingPT: true,
            user: { select: { name: true } },
          },
        },
        schedule: {
          select: {
            status: true,
            scheduledAt: true,
            trainer: {
              select: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "출석 기록을 찾을 수 없습니다." }, { status: 404 });
    }

    // 회원은 자신의 기록만 조회 가능
    if (session.user.role === "MEMBER") {
      if (!attendance.memberProfile || attendance.memberProfile.userId !== session.user.id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
      // 회원에게는 internalNotes를 숨김
      return NextResponse.json({
        ...attendance,
        internalNotes: undefined,
      });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "출석 기록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: 출석 기록 메모 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 트레이너와 관리자만 수정 가능
    if (session.user.role === "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateAttendanceSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        schedule: true,
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "출석 기록을 찾을 수 없습니다." }, { status: 404 });
    }

    // 트레이너인 경우 자신의 출석 기록만 수정 가능
    if (session.user.role === "TRAINER") {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (attendance.schedule?.trainerId !== trainerProfile?.id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    const { notes, internalNotes } = validatedData.data;

    const updatedAttendance = await prisma.attendance.update({
      where: { id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(internalNotes !== undefined && { internalNotes }),
      },
      select: {
        id: true,
        checkInTime: true,
        remainingPTAfter: true,
        notes: true,
        internalNotes: true,
        memberProfile: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      message: "메모가 수정되었습니다.",
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { error: "메모 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 출석 기록 삭제 (관리자 전용)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 관리자만 삭제 가능
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "관리자만 삭제할 수 있습니다." }, { status: 403 });
    }

    const { id } = await params;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        memberProfile: true,
        schedule: true,
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "출석 기록을 찾을 수 없습니다." }, { status: 404 });
    }

    // 트랜잭션으로 출석 삭제 및 PT 복원
    await prisma.$transaction(async (tx) => {
      // 출석 기록 삭제
      await tx.attendance.delete({
        where: { id },
      });

      // PT 횟수 복원 (회원이 삭제되지 않은 경우만)
      if (attendance.memberProfileId) {
        await tx.memberProfile.update({
          where: { id: attendance.memberProfileId },
          data: { remainingPT: { increment: 1 } },
        });
      }

      // 연결된 스케줄이 있으면 상태를 SCHEDULED로 변경
      if (attendance.scheduleId) {
        await tx.schedule.update({
          where: { id: attendance.scheduleId },
          data: { status: "SCHEDULED" },
        });
      }
    });

    return NextResponse.json({
      message: "출석 기록이 삭제되었습니다. (PT 1회 복원)",
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json(
      { error: "출석 기록 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
