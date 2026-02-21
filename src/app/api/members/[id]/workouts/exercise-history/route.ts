import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { hasRole } from "@/lib/role-utils";

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
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseIdsParam = searchParams.get("exerciseIds");
    if (!exerciseIdsParam) {
      return NextResponse.json({ error: "exerciseIds 파라미터가 필요합니다." }, { status: 400 });
    }

    const exerciseIds = exerciseIdsParam.split(",").filter(Boolean);
    if (exerciseIds.length === 0) {
      return NextResponse.json({});
    }

    const lastSets = await prisma.workoutSet.findMany({
      where: {
        exerciseId: { in: exerciseIds },
        workoutSession: {
          memberProfileId,
          status: "COMPLETED",
        },
      },
      orderBy: [
        { workoutSession: { completedAt: "desc" } },
        { setNumber: "asc" },
      ],
      select: {
        exerciseId: true,
        setNumber: true,
        weight: true,
        reps: true,
        durationMinutes: true,
        workoutSession: { select: { id: true, completedAt: true } },
      },
    });

    const result: Record<
      string,
      {
        sets: { setNumber: number; weight: number | null; reps: number | null; durationMinutes: number | null }[];
        completedAt: string;
      }
    > = {};
    const latestSessionPerExercise: Record<string, string> = {};

    for (const set of lastSets) {
      const exId = set.exerciseId;
      if (!latestSessionPerExercise[exId]) {
        latestSessionPerExercise[exId] = set.workoutSession.id;
        result[exId] = {
          sets: [],
          completedAt: set.workoutSession.completedAt?.toISOString() ?? "",
        };
      }
      if (set.workoutSession.id === latestSessionPerExercise[exId]) {
        result[exId].sets.push({
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          durationMinutes: set.durationMinutes,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching member exercise history:", error);
    return NextResponse.json(
      { error: "운동 기록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
