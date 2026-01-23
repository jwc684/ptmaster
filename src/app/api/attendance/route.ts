import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // 날짜 필터 설정
    let startDate: Date;
    let endDate: Date;

    if (dateParam) {
      startDate = new Date(dateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // 기본값: 오늘
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // 트레이너인 경우 자신의 출석 기록만 조회
    let trainerFilter = {};
    if (session.user.role === "TRAINER") {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (trainerProfile) {
        trainerFilter = {
          schedule: {
            trainerId: trainerProfile.id,
          },
        };
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        checkInTime: {
          gte: startDate,
          lte: endDate,
        },
        ...trainerFilter,
      },
      select: {
        id: true,
        checkInTime: true,
        notes: true,
        memberProfile: {
          select: {
            id: true,
            remainingPT: true,
            user: { select: { name: true } },
          },
        },
        schedule: {
          select: {
            trainer: {
              select: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { checkInTime: "desc" },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "출석 기록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
