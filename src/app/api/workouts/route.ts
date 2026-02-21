import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!memberProfile) {
      return NextResponse.json({ error: "회원 프로필이 없습니다." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const weekStart = searchParams.get("weekStart");
    const weekEnd = searchParams.get("weekEnd");

    // Week range query for calendar dots
    if (weekStart && weekEnd) {
      const sessions = await prisma.workoutSession.findMany({
        where: {
          memberProfileId: memberProfile.id,
          date: {
            gte: new Date(weekStart),
            lte: new Date(weekEnd),
          },
        },
        select: { id: true, date: true, status: true },
        orderBy: { date: "asc" },
      });

      return NextResponse.json({
        weekSessions: sessions.map((s) => ({
          id: s.id,
          date: s.date.toISOString(),
          status: s.status,
        })),
      });
    }

    const where: Record<string, unknown> = {
      memberProfileId: memberProfile.id,
    };

    if (dateStr) {
      const date = new Date(dateStr);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: date, lt: nextDay };
    }

    const sessions = await prisma.workoutSession.findMany({
      where,
      include: {
        sets: {
          include: {
            exercise: { select: { id: true, name: true, type: true } },
          },
          orderBy: [{ order: "asc" }, { setNumber: "asc" }],
        },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    // Build summaries
    const workouts = sessions.map((s) => {
      const exerciseMap = new Map<string, { name: string; type: string; setCount: number }>();
      for (const set of s.sets) {
        const existing = exerciseMap.get(set.exerciseId);
        if (existing) {
          existing.setCount++;
        } else {
          exerciseMap.set(set.exerciseId, {
            name: set.exercise.name,
            type: set.exercise.type,
            setCount: 1,
          });
        }
      }

      return {
        id: s.id,
        date: s.date,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        status: s.status,
        notes: s.notes,
        totalSets: s.sets.length,
        exercises: Array.from(exerciseMap.values()),
      };
    });

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return NextResponse.json(
      { error: "운동 기록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberProfile = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, shopId: true },
    });

    if (!memberProfile) {
      return NextResponse.json({ error: "회원 프로필이 없습니다." }, { status: 404 });
    }

    // Check for existing IN_PROGRESS session
    const existing = await prisma.workoutSession.findFirst({
      where: {
        memberProfileId: memberProfile.id,
        status: "IN_PROGRESS",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 진행 중인 운동이 있습니다.", workoutId: existing.id },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const sessionDate = body.date ? new Date(body.date) : new Date();

    // Check for existing session on the same date (including PLANNED)
    const startOfDay = new Date(sessionDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sessionDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingOnDate = await prisma.workoutSession.findFirst({
      where: {
        memberProfileId: memberProfile.id,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existingOnDate) {
      return NextResponse.json(
        { error: "해당 날짜에 이미 운동이 존재합니다.", workoutId: existingOnDate.id },
        { status: 400 }
      );
    }

    const workout = await prisma.workoutSession.create({
      data: {
        memberProfileId: memberProfile.id,
        shopId: memberProfile.shopId,
        date: sessionDate,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(
      { message: "운동을 시작합니다!", workout },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating workout:", error);
    return NextResponse.json(
      { error: "운동 시작 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
