import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { hasRole } from "@/lib/role-utils";

export async function GET(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN, TRAINER, and SUPER_ADMIN can access attendance
    if (!hasRole(authResult.userRoles, "ADMIN", "TRAINER", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const memberIdParam = searchParams.get("memberId");

    // 날짜 필터 설정
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      // 기간 필터
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // 기본값: 이번 달
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // 트레이너인 경우 자신의 출석 기록만 조회
    let trainerFilter = {};
    if (hasRole(authResult.userRoles, "TRAINER")) {
      const trainerProfile = await prisma.trainerProfile.findUnique({
        where: { userId: authResult.userId },
      });
      if (trainerProfile) {
        trainerFilter = {
          schedule: {
            trainerId: trainerProfile.id,
          },
        };
      }
    }

    // 회원 필터
    const memberFilter = memberIdParam ? { memberProfileId: memberIdParam } : {};

    // Build shop filter
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const attendances = await prisma.attendance.findMany({
      where: {
        ...shopFilter,
        checkInTime: {
          gte: startDate,
          lte: endDate,
        },
        ...trainerFilter,
        ...memberFilter,
      },
      select: {
        id: true,
        checkInTime: true,
        remainingPTAfter: true,
        unitPrice: true,
        notes: true,
        internalNotes: true,
        shopId: true,
        memberProfile: {
          select: {
            id: true,
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
        shop: {
          select: {
            id: true,
            name: true,
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
