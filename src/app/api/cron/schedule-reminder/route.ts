import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderNotification } from "@/lib/kakao-message";

export async function GET(request: Request) {
  // CRON_SECRET 검증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // 내일 날짜 계산 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // UTC+9
    const kstNow = new Date(now.getTime() + kstOffset);

    // 내일 KST 00:00 ~ 23:59
    const tomorrowKST = new Date(kstNow);
    tomorrowKST.setDate(tomorrowKST.getDate() + 1);
    tomorrowKST.setHours(0, 0, 0, 0);

    const dayAfterKST = new Date(tomorrowKST);
    dayAfterKST.setDate(dayAfterKST.getDate() + 1);

    // UTC로 변환
    const tomorrowStartUTC = new Date(tomorrowKST.getTime() - kstOffset);
    const tomorrowEndUTC = new Date(dayAfterKST.getTime() - kstOffset);

    // 내일 SCHEDULED 상태인 모든 일정 조회
    const schedules = await prisma.schedule.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          gte: tomorrowStartUTC,
          lt: tomorrowEndUTC,
        },
      },
      select: {
        id: true,
        scheduledAt: true,
        shopId: true,
        memberProfile: {
          select: {
            remainingPT: true,
            user: { select: { id: true, name: true } },
          },
        },
        trainer: {
          select: {
            user: { select: { name: true } },
          },
        },
        shop: {
          select: { name: true },
        },
      },
    });

    if (schedules.length === 0) {
      const duration = Date.now() - startTime;
      await prisma.cronLog.create({
        data: {
          endpoint: "/api/cron/schedule-reminder",
          status: "NO_DATA",
          total: 0,
          sent: 0,
          failed: 0,
          duration,
        },
      });

      return NextResponse.json({
        message: "No schedules for tomorrow",
        sent: 0,
        failed: 0,
      });
    }

    let sent = 0;
    let failed = 0;

    // 각 일정에 대해 리마인더 발송
    for (const schedule of schedules) {
      if (!schedule.shop || !schedule.trainer) continue;

      try {
        const success = await sendReminderNotification({
          memberUserId: schedule.memberProfile.user.id,
          shopName: schedule.shop.name,
          trainerName: schedule.trainer.user.name,
          scheduledAt: schedule.scheduledAt,
          remainingPT: schedule.memberProfile.remainingPT,
          shopId: schedule.shopId || undefined,
        });

        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`[Cron] Reminder failed for schedule ${schedule.id}:`, err);
        failed++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Schedule reminder: ${schedules.length} schedules, ${sent} sent, ${failed} failed (${duration}ms)`);

    await prisma.cronLog.create({
      data: {
        endpoint: "/api/cron/schedule-reminder",
        status: "SUCCESS",
        total: schedules.length,
        sent,
        failed,
        duration,
      },
    });

    return NextResponse.json({
      message: `Processed ${schedules.length} schedules`,
      total: schedules.length,
      sent,
      failed,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[Cron] Schedule reminder error:", error);

    try {
      await prisma.cronLog.create({
        data: {
          endpoint: "/api/cron/schedule-reminder",
          status: "ERROR",
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
      });
    } catch {
      console.error("[Cron] Failed to log cron error");
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
