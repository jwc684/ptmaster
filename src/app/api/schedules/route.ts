import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scheduleSchema = z.object({
  memberProfileId: z.string().min(1, "회원을 선택해주세요."),
  scheduledAt: z.string().min(1, "예약 일시를 선택해주세요."),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD 형식 (단일 날짜)
    const startDate = searchParams.get("startDate"); // 기간 시작
    const endDate = searchParams.get("endDate"); // 기간 종료
    const status = searchParams.get("status"); // 상태 필터

    let trainerId: string | undefined;

    // 트레이너인 경우 자신의 일정만 조회
    if (session.user.role === "TRAINER") {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!trainerProfile) {
        return NextResponse.json({ error: "트레이너 프로필이 없습니다." }, { status: 404 });
      }
      trainerId = trainerProfile.id;
    }

    // 날짜 필터 설정
    let dateFilter: Record<string, unknown> = {};
    if (date) {
      // 단일 날짜 필터
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = {
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    } else if (startDate || endDate) {
      // 기간 필터
      dateFilter = { scheduledAt: {} };
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        (dateFilter.scheduledAt as Record<string, Date>).gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (dateFilter.scheduledAt as Record<string, Date>).lte = end;
      }
    }

    // 상태 필터
    const statusFilter = status ? { status: status as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" } : {};

    const schedules = await prisma.schedule.findMany({
      where: {
        ...(trainerId && { trainerId }),
        ...dateFilter,
        ...statusFilter,
      },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        notes: true,
        memberProfile: {
          select: {
            id: true,
            remainingPT: true,
            user: { select: { name: true, phone: true } },
          },
        },
        trainer: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
        attendance: {
          select: { id: true, checkInTime: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "일정을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 트레이너 또는 관리자만 예약 가능
    if (session.user.role === "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = scheduleSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { memberProfileId, scheduledAt, notes } = validatedData.data;

    // 트레이너 ID 가져오기
    let trainerId: string;
    if (session.user.role === "TRAINER") {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!trainerProfile) {
        return NextResponse.json({ error: "트레이너 프로필이 없습니다." }, { status: 404 });
      }
      trainerId = trainerProfile.id;
    } else {
      // 관리자인 경우 회원의 담당 트레이너 사용
      const member = await prisma.memberProfile.findUnique({
        where: { id: memberProfileId },
      });
      if (!member?.trainerId) {
        return NextResponse.json({ error: "회원에게 배정된 트레이너가 없습니다." }, { status: 400 });
      }
      trainerId = member.trainerId;
    }

    const schedule = await prisma.schedule.create({
      data: {
        memberProfileId,
        trainerId,
        scheduledAt: new Date(scheduledAt),
        notes,
      },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        memberProfile: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: `${schedule.memberProfile.user.name}님 예약이 등록되었습니다.`,
        schedule,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: "예약 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
