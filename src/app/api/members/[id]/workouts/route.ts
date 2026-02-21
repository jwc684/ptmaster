import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { hasRole } from "@/lib/role-utils";
import { createWorkoutPlanSchema } from "@/lib/validations/workout";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (!hasRole(authResult.userRoles, "TRAINER", "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id: memberProfileId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    // Verify member exists and belongs to correct shop
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const memberWhere: Record<string, unknown> = { id: memberProfileId, ...shopFilter };

    // TRAINER: only see assigned members
    if (hasRole(authResult.userRoles, "TRAINER") && !hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: authResult.userId },
        select: { id: true },
      });
      if (!trainerProfile) {
        return NextResponse.json({ error: "트레이너 프로필이 없습니다." }, { status: 403 });
      }
      memberWhere.trainerId = trainerProfile.id;
    }

    const member = await prisma.memberProfile.findFirst({
      where: memberWhere,
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }

    const sessions = await prisma.workoutSession.findMany({
      where: {
        memberProfileId,
        status: "COMPLETED",
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      include: {
        sets: {
          include: {
            exercise: { select: { id: true, name: true, type: true, category: true } },
          },
          orderBy: [{ order: "asc" }, { setNumber: "asc" }],
        },
      },
      orderBy: { completedAt: "desc" },
      take: limit + 1,
    });

    const hasMore = sessions.length > limit;
    const items = hasMore ? sessions.slice(0, limit) : sessions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const workouts = items.map((s) => ({
      id: s.id,
      date: s.date,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      notes: s.notes,
      sets: s.sets.map((set) => ({
        id: set.id,
        exerciseId: set.exerciseId,
        exercise: set.exercise,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        durationMinutes: set.durationMinutes,
        isCompleted: set.isCompleted,
      })),
    }));

    return NextResponse.json({ workouts, nextCursor });
  } catch (error) {
    console.error("Error fetching member workouts:", error);
    return NextResponse.json(
      { error: "운동 기록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    if (!hasRole(authResult.userRoles, "TRAINER", "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id: memberProfileId } = await params;
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const memberWhere: Record<string, unknown> = { id: memberProfileId, ...shopFilter };

    // TRAINER: only assigned members
    if (hasRole(authResult.userRoles, "TRAINER") && !hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: authResult.userId },
        select: { id: true },
      });
      if (!trainerProfile) {
        return NextResponse.json({ error: "트레이너 프로필이 없습니다." }, { status: 403 });
      }
      memberWhere.trainerId = trainerProfile.id;
    }

    const member = await prisma.memberProfile.findFirst({
      where: memberWhere,
      select: { id: true, shopId: true },
    });

    if (!member) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createWorkoutPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "유효하지 않은 데이터입니다." },
        { status: 400 }
      );
    }

    const { date, exercises, notes } = parsed.data;
    const sessionDate = new Date(date);
    const startOfDay = new Date(sessionDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sessionDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for existing session on the same date
    const existingOnDate = await prisma.workoutSession.findFirst({
      where: {
        memberProfileId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existingOnDate) {
      return NextResponse.json(
        { error: "해당 날짜에 이미 운동이 존재합니다." },
        { status: 400 }
      );
    }

    // Create PLANNED session with sets in a transaction
    const workout = await prisma.$transaction(async (tx) => {
      const session = await tx.workoutSession.create({
        data: {
          memberProfileId,
          shopId: member.shopId,
          date: sessionDate,
          startedAt: sessionDate,
          status: "PLANNED",
          notes: notes || null,
          createdById: authResult.userId,
        },
      });

      const setsData = exercises.flatMap((ex, exIdx) =>
        ex.sets.map((set, setIdx) => ({
          workoutSessionId: session.id,
          exerciseId: ex.exerciseId,
          order: exIdx,
          setNumber: setIdx + 1,
          weight: set.weight ?? null,
          reps: set.reps ?? null,
          durationMinutes: set.durationMinutes ?? null,
          isCompleted: false,
        }))
      );

      await tx.workoutSet.createMany({ data: setsData });

      return session;
    });

    return NextResponse.json(
      { message: "운동 계획이 추가되었습니다.", workout },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating workout plan:", error);
    return NextResponse.json(
      { error: "운동 계획 추가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
