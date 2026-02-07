import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendAttendanceNotification, sendCancellationNotification, sendScheduleChangeNotification } from "@/lib/kakao-message";

const updateScheduleSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(), // 내부 메모 (트레이너/관리자용)
  deductPT: z.boolean().optional(), // 취소 시 PT 차감 여부
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

    const { status, scheduledAt, notes, internalNotes, deductPT } = validatedData.data;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        memberProfile: { include: { user: { select: { id: true } } } },
        attendance: true,
        trainer: { select: { id: true, user: { select: { name: true } } } },
        shop: { select: { name: true } },
      },
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

    // 출석 완료 처리 (PT는 일정 생성 시 이미 차감됨)
    if (status === "COMPLETED" && schedule.status !== "COMPLETED") {
      const isFree = schedule.notes?.includes("[무료]") ?? false;

      // 건당 PT 비용 계산 (무료 PT는 0원)
      let unitPrice: number | null = null;
      if (!isFree) {
        const payments = await prisma.payment.findMany({
          where: { memberProfileId: schedule.memberProfileId, status: "COMPLETED" },
          select: { amount: true, ptCount: true },
        });
        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalPTCount = payments.reduce((sum, p) => sum + p.ptCount, 0);
        unitPrice = totalPTCount > 0 ? Math.round(totalAmount / totalPTCount) : null;
      } else {
        unitPrice = 0;
      }

      // 트랜잭션으로 출석 처리 (PT 차감 없음 - 이미 일정 생성 시 차감됨)
      const updatedSchedule = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedule.update({
          where: { id },
          data: { status: "COMPLETED", notes },
        });

        // 출석 기록 생성 (현재 잔여 회수 저장 + 건당 비용)
        await tx.attendance.create({
          data: {
            memberProfileId: schedule.memberProfileId,
            scheduleId: id,
            remainingPTAfter: schedule.memberProfile.remainingPT,
            unitPrice,
            notes,
            internalNotes,
          },
        });

        return updated;
      });

      // 카카오톡 출석 알림 전송 (비동기, 실패해도 출석은 성공)
      if (schedule.shop && schedule.trainer) {
        sendAttendanceNotification({
          memberUserId: schedule.memberProfile.user.id,
          shopName: schedule.shop.name,
          trainerName: schedule.trainer.user.name,
          scheduledAt: schedule.scheduledAt,
          remainingPT: schedule.memberProfile.remainingPT,
          shopId: schedule.shopId || undefined,
          trainerId: schedule.trainer.id,
        }).catch((err) => console.error("[Schedule] Kakao attendance notification error:", err));
      }

      return NextResponse.json({
        message: "출석이 완료되었습니다.",
        schedule: updatedSchedule,
      });
    }

    // 출석 되돌리기 (COMPLETED -> SCHEDULED) - PT 변동 없음 (이미 일정 생성 시 차감됨)
    if (status === "SCHEDULED" && schedule.status === "COMPLETED") {
      // 트랜잭션으로 출석 되돌리기
      const updatedSchedule = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedule.update({
          where: { id },
          data: { status: "SCHEDULED", notes },
        });

        // 출석 기록이 있으면 삭제 (PT는 복원하지 않음 - 일정 생성 시 차감된 상태 유지)
        if (schedule.attendance) {
          await tx.attendance.delete({
            where: { id: schedule.attendance.id },
          });
        }

        return updated;
      });

      return NextResponse.json({
        message: "출석이 되돌려졌습니다. (일정 상태로 복귀)",
        schedule: updatedSchedule,
      });
    }

    // 취소 처리 (SCHEDULED -> CANCELLED) - PT는 일정 생성 시 이미 차감됨
    if (status === "CANCELLED" && schedule.status === "SCHEDULED") {
      // PT 유지 여부에 따라 처리 (deductPT=true면 차감 유지, false면 복구)
      const keepDeduction = deductPT === true; // 기본값은 복구 (미차감)

      if (keepDeduction) {
        // PT 차감 유지 (복구하지 않음)
        // 건당 PT 비용 계산 (회원의 모든 결제 기록 기반)
        const payments = await prisma.payment.findMany({
          where: { memberProfileId: schedule.memberProfileId, status: "COMPLETED" },
          select: { amount: true, ptCount: true },
        });
        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalPTCount = payments.reduce((sum, p) => sum + p.ptCount, 0);
        const unitPrice = totalPTCount > 0 ? Math.round(totalAmount / totalPTCount) : null;

        // 트랜잭션으로 취소 처리 (차감 유지)
        const updatedSchedule = await prisma.$transaction(async (tx) => {
          const updated = await tx.schedule.update({
            where: { id },
            data: { status: "CANCELLED", notes: notes ? `[취소-차감] ${notes}` : "[취소-차감]" },
          });

          // 취소 기록 생성 (차감 유지 표시용)
          await tx.attendance.create({
            data: {
              memberProfileId: schedule.memberProfileId,
              scheduleId: id,
              remainingPTAfter: schedule.memberProfile.remainingPT,
              unitPrice,
              notes: notes ? `[취소-차감] ${notes}` : "[취소-차감]",
              internalNotes,
            },
          });

          return updated;
        });

        // 카카오톡 취소 알림 전송
        if (schedule.shop && schedule.trainer) {
          sendCancellationNotification({
            memberUserId: schedule.memberProfile.user.id,
            shopName: schedule.shop.name,
            trainerName: schedule.trainer.user.name,
            scheduledAt: schedule.scheduledAt,
            remainingPT: schedule.memberProfile.remainingPT,
            shopId: schedule.shopId || undefined,
            trainerId: schedule.trainer.id,
          }).catch((err) => console.error("[Schedule] Kakao cancellation notification error:", err));
        }

        return NextResponse.json({
          message: "예약이 취소되었습니다. (PT 차감 유지)",
          schedule: updatedSchedule,
        });
      } else {
        // PT 복구 (미차감)
        const updatedSchedule = await prisma.$transaction(async (tx) => {
          const updated = await tx.schedule.update({
            where: { id },
            data: { status: "CANCELLED", notes: notes ? `[취소] ${notes}` : "[취소]" },
          });

          // PT 1회 복구
          await tx.memberProfile.update({
            where: { id: schedule.memberProfileId },
            data: { remainingPT: { increment: 1 } },
          });

          return updated;
        });

        // 카카오톡 취소 알림 전송 (PT 1회 복구 후이므로 +1)
        if (schedule.shop && schedule.trainer) {
          sendCancellationNotification({
            memberUserId: schedule.memberProfile.user.id,
            shopName: schedule.shop.name,
            trainerName: schedule.trainer.user.name,
            scheduledAt: schedule.scheduledAt,
            remainingPT: schedule.memberProfile.remainingPT + 1,
            shopId: schedule.shopId || undefined,
            trainerId: schedule.trainer.id,
          }).catch((err) => console.error("[Schedule] Kakao cancellation notification error:", err));
        }

        return NextResponse.json({
          message: "예약이 취소되었습니다. (PT 1회 복구)",
          schedule: updatedSchedule,
        });
      }
    }

    // 취소 되돌리기 (CANCELLED -> SCHEDULED)
    if (status === "SCHEDULED" && schedule.status === "CANCELLED") {
      // attendance 기록 유무로 차감/미차감 여부 판단
      const wasKeptDeducted = !!schedule.attendance; // attendance 있음 = 차감 유지 취소

      const updatedSchedule = await prisma.$transaction(async (tx) => {
        const updated = await tx.schedule.update({
          where: { id },
          data: { status: "SCHEDULED", notes },
        });

        if (wasKeptDeducted) {
          // 차감 유지 취소였음 - attendance 기록만 삭제, PT 변동 없음
          await tx.attendance.delete({
            where: { id: schedule.attendance!.id },
          });
        } else {
          // 미차감 취소였음 - PT가 복구됐었으므로 다시 차감
          await tx.memberProfile.update({
            where: { id: schedule.memberProfileId },
            data: { remainingPT: { decrement: 1 } },
          });
        }

        return updated;
      });

      return NextResponse.json({
        message: wasKeptDeducted
          ? "취소가 되돌려졌습니다. (예약 상태로 복귀)"
          : "취소가 되돌려졌습니다. (PT 1회 차감)",
        schedule: updatedSchedule,
      });
    }

    // 일반 업데이트 (상태 변경, 일정 변경, 메모 변경)
    const previousScheduledAt = schedule.scheduledAt;
    const isTimeChanged = scheduledAt !== undefined && new Date(scheduledAt).getTime() !== previousScheduledAt.getTime();

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

    // 시간 변경 시 카카오톡 알림 전송
    if (isTimeChanged && schedule.shop && schedule.trainer) {
      sendScheduleChangeNotification({
        memberUserId: schedule.memberProfile.user.id,
        shopName: schedule.shop.name,
        trainerName: schedule.trainer.user.name,
        previousScheduledAt,
        newScheduledAt: new Date(scheduledAt!),
        remainingPT: schedule.memberProfile.remainingPT,
        shopId: schedule.shopId || undefined,
        trainerId: schedule.trainer.id,
      }).catch((err) => console.error("[Schedule] Kakao schedule change notification error:", err));
    }

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
      include: { attendance: true },
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

    // PT 복구 여부 결정
    // - SCHEDULED: PT 복구 (일정 생성 시 차감되었으므로)
    // - COMPLETED: PT 복구 안함 (PT가 사용됨)
    // - CANCELLED with attendance: PT 복구 안함 (차감 유지 취소였음)
    // - CANCELLED without attendance: PT 복구 안함 (이미 취소 시 복구됨)
    const shouldRestorePT = schedule.status === "SCHEDULED";

    await prisma.$transaction(async (tx) => {
      // 관련 출석 기록 먼저 삭제
      if (schedule.attendance) {
        await tx.attendance.delete({ where: { id: schedule.attendance.id } });
      }

      // 일정 삭제
      await tx.schedule.delete({ where: { id } });

      // SCHEDULED 상태였다면 PT 복구
      if (shouldRestorePT) {
        await tx.memberProfile.update({
          where: { id: schedule.memberProfileId },
          data: { remainingPT: { increment: 1 } },
        });
      }
    });

    return NextResponse.json({
      message: shouldRestorePT
        ? "일정이 삭제되었습니다. (PT 1회 복구)"
        : "일정이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json(
      { error: "일정 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
