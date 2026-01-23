import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateScheduleSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role === "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateScheduleSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { status, scheduledAt, notes } = validatedData.data;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: { memberProfile: true, attendance: true },
    });

    if (!schedule) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    // 트레이너인 경우 자신의 일정만 수정 가능
    if (session.user.role === "TRAINER") {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (schedule.trainerId !== trainerProfile?.id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    // 출석 완료 처리
    if (status === "COMPLETED" && schedule.status !== "COMPLETED") {
      // 잔여 PT가 있는지 확인
      if (schedule.memberProfile.remainingPT <= 0) {
        return NextResponse.json(
          { error: "잔여 PT가 없습니다." },
          { status: 400 }
        );
      }

      // 트랜잭션으로 출석 처리
      const [updatedSchedule] = await prisma.$transaction([
        prisma.schedule.update({
          where: { id },
          data: { status: "COMPLETED", notes },
        }),
        // 출석 기록 생성
        prisma.attendance.create({
          data: {
            memberProfileId: schedule.memberProfileId,
            scheduleId: id,
            notes,
          },
        }),
        // PT 횟수 차감
        prisma.memberProfile.update({
          where: { id: schedule.memberProfileId },
          data: { remainingPT: { decrement: 1 } },
        }),
      ]);

      return NextResponse.json({
        message: "출석이 완료되었습니다.",
        schedule: updatedSchedule,
      });
    }

    // 출석 되돌리기 (COMPLETED -> SCHEDULED)
    if (status === "SCHEDULED" && schedule.status === "COMPLETED") {
      // 트랜잭션으로 출석 되돌리기
      const updatedSchedule = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedule.update({
          where: { id },
          data: { status: "SCHEDULED", notes },
        });

        // PT 횟수 복원
        await tx.memberProfile.update({
          where: { id: schedule.memberProfileId },
          data: { remainingPT: { increment: 1 } },
        });

        // 출석 기록이 있으면 삭제
        if (schedule.attendance) {
          await tx.attendance.delete({
            where: { id: schedule.attendance.id },
          });
        }

        return updated;
      });

      return NextResponse.json({
        message: "출석이 되돌려졌습니다.",
        schedule: updatedSchedule,
      });
    }

    // 취소 처리 (SCHEDULED -> CANCELLED) - PT 차감 및 기록 생성
    if (status === "CANCELLED" && schedule.status === "SCHEDULED") {
      // 잔여 PT가 있는지 확인
      if (schedule.memberProfile.remainingPT <= 0) {
        return NextResponse.json(
          { error: "잔여 PT가 없습니다." },
          { status: 400 }
        );
      }

      // 트랜잭션으로 취소 처리
      const [updatedSchedule] = await prisma.$transaction([
        prisma.schedule.update({
          where: { id },
          data: { status: "CANCELLED", notes },
        }),
        // 취소 기록 생성 (출석 기록으로 남김)
        prisma.attendance.create({
          data: {
            memberProfileId: schedule.memberProfileId,
            scheduleId: id,
            notes: notes ? `[취소] ${notes}` : "[취소]",
          },
        }),
        // PT 횟수 차감
        prisma.memberProfile.update({
          where: { id: schedule.memberProfileId },
          data: { remainingPT: { decrement: 1 } },
        }),
      ]);

      return NextResponse.json({
        message: "예약이 취소되었습니다. (PT 1회 차감)",
        schedule: updatedSchedule,
      });
    }

    // 취소 되돌리기 (CANCELLED -> SCHEDULED) - PT 복원
    if (status === "SCHEDULED" && schedule.status === "CANCELLED") {
      // 트랜잭션으로 취소 되돌리기
      const updatedSchedule = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedule.update({
          where: { id },
          data: { status: "SCHEDULED", notes },
        });

        // PT 횟수 복원
        await tx.memberProfile.update({
          where: { id: schedule.memberProfileId },
          data: { remainingPT: { increment: 1 } },
        });

        // 출석(취소) 기록이 있으면 삭제
        if (schedule.attendance) {
          await tx.attendance.delete({
            where: { id: schedule.attendance.id },
          });
        }

        return updated;
      });

      return NextResponse.json({
        message: "취소가 되돌려졌습니다. (PT 1회 복원)",
        schedule: updatedSchedule,
      });
    }

    // 일반 업데이트 (상태 변경, 일정 변경, 메모 변경)
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (notes !== undefined) updateData.notes = notes;

    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        notes: true,
        memberProfile: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      message: "일정이 수정되었습니다.",
      schedule: updatedSchedule,
    });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "일정 수정 중 오류가 발생했습니다." },
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
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (session.user.role === "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    // 트레이너인 경우 자신의 일정만 삭제 가능
    if (session.user.role === "TRAINER") {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (schedule.trainerId !== trainerProfile?.id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    await prisma.schedule.delete({ where: { id } });

    return NextResponse.json({ message: "일정이 삭제되었습니다." });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json(
      { error: "일정 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
