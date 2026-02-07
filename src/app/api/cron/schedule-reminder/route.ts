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

    console.log(`[Cron] Schedule reminder: ${schedules.length} schedules, ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      message: `Processed ${schedules.length} schedules`,
      total: schedules.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error("[Cron] Schedule reminder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
