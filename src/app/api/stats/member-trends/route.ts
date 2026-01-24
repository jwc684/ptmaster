import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";

export async function GET(request: Request) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can access member trends
    if (!["ADMIN", "SUPER_ADMIN"].includes(authResult.userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily"; // daily, weekly, monthly

    // Build shop filter
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const now = new Date();
    let results: { date: string; label: string; count: number }[] = [];

    if (period === "daily") {
      // Last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const count = await prisma.memberProfile.count({
          where: {
            ...shopFilter,
            joinDate: { gte: date, lt: nextDate },
          },
        });

        results.push({
          date: date.toISOString().split("T")[0],
          label: date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
          count,
        });
      }
    } else if (period === "weekly") {
      // Last 12 weeks (including current week)
      for (let i = 11; i >= 0; i--) {
        // Start from today and go back i weeks
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        // Find the Monday of the current week
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + mondayOffset - (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const count = await prisma.memberProfile.count({
          where: {
            ...shopFilter,
            joinDate: { gte: weekStart, lt: weekEnd },
          },
        });

        const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

        results.push({
          date: weekStart.toISOString().split("T")[0],
          label: weekLabel,
          count,
        });
      }
    } else if (period === "monthly") {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const count = await prisma.memberProfile.count({
          where: {
            ...shopFilter,
            joinDate: { gte: date, lt: nextDate },
          },
        });

        results.push({
          date: date.toISOString().split("T")[0],
          label: date.toLocaleDateString("ko-KR", { month: "short" }),
          count,
        });
      }
    }

    const totalCount = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      period,
      data: results,
      totals: {
        count: totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching member trends:", error);
    return NextResponse.json(
      { error: "신규 회원 추이를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
