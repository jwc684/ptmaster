import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily"; // daily, weekly, monthly

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
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        const dayOfWeek = endDate.getDay();
        endDate.setDate(endDate.getDate() - dayOfWeek - (i * 7));

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        const nextDate = new Date(endDate);
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(0, 0, 0, 0);

        const count = await prisma.memberProfile.count({
          where: {
            joinDate: { gte: startDate, lt: nextDate },
          },
        });

        const weekLabel = `${startDate.getMonth() + 1}/${startDate.getDate()}`;

        results.push({
          date: startDate.toISOString().split("T")[0],
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
