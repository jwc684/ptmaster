import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop } from "@/lib/shop-utils";

// GET /api/super-admin/stats/active-users - DAU/MAU data
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!authResult.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // DAU: last 30 days, distinct users per day
    const dauDays = 30;
    const dauStart = new Date(today);
    dauStart.setDate(dauStart.getDate() - dauDays + 1);

    // MAU: last 12 months, distinct users per month
    const mauMonths = 12;
    const mauStart = new Date(now.getFullYear(), now.getMonth() - mauMonths + 1, 1);

    // Use raw SQL for efficient distinct count per day/month
    // DAU query: count distinct userId per day, grouped by date and userRole
    const dauRaw = await prisma.$queryRaw<
      Array<{ date: string; role: string; count: bigint }>
    >`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Seoul') as date,
        user_role as role,
        COUNT(DISTINCT user_id) as count
      FROM access_logs
      WHERE created_at >= ${dauStart}
        AND user_role != 'SUPER_ADMIN'
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul'), user_role
      ORDER BY date ASC
    `;

    // MAU query: count distinct userId per month, grouped by month and userRole
    const mauRaw = await prisma.$queryRaw<
      Array<{ month: string; role: string; count: bigint }>
    >`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM') as month,
        user_role as role,
        COUNT(DISTINCT user_id) as count
      FROM access_logs
      WHERE created_at >= ${mauStart}
        AND user_role != 'SUPER_ADMIN'
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM'), user_role
      ORDER BY month ASC
    `;

    // Today's active users and this month's active users (totals)
    const todayTotal = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM access_logs
      WHERE created_at >= ${today}
        AND user_role != 'SUPER_ADMIN'
    `;

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTotal = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT user_id) as count
      FROM access_logs
      WHERE created_at >= ${thisMonthStart}
        AND user_role != 'SUPER_ADMIN'
    `;

    // Process DAU data into a date-keyed structure
    const dauMap = new Map<string, { admin: number; trainer: number; member: number; total: number }>();
    for (let i = 0; i < dauDays; i++) {
      const d = new Date(dauStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dauMap.set(key, { admin: 0, trainer: 0, member: 0, total: 0 });
    }

    for (const row of dauRaw) {
      const key = typeof row.date === "string" ? row.date : new Date(row.date).toISOString().slice(0, 10);
      const entry = dauMap.get(key);
      if (entry) {
        const count = Number(row.count);
        if (row.role === "ADMIN") entry.admin += count;
        else if (row.role === "TRAINER") entry.trainer += count;
        else if (row.role === "MEMBER") entry.member += count;
        entry.total = entry.admin + entry.trainer + entry.member;
      }
    }

    const dau = Array.from(dauMap.entries()).map(([date, counts]) => {
      const d = new Date(date);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      return { date, label, ...counts };
    });

    // Process MAU data
    const mauMap = new Map<string, { admin: number; trainer: number; member: number; total: number }>();
    for (let i = 0; i < mauMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - mauMonths + 1 + i, 1);
      const key = d.toISOString().slice(0, 7);
      mauMap.set(key, { admin: 0, trainer: 0, member: 0, total: 0 });
    }

    for (const row of mauRaw) {
      const entry = mauMap.get(row.month);
      if (entry) {
        const count = Number(row.count);
        if (row.role === "ADMIN") entry.admin += count;
        else if (row.role === "TRAINER") entry.trainer += count;
        else if (row.role === "MEMBER") entry.member += count;
        entry.total = entry.admin + entry.trainer + entry.member;
      }
    }

    const mau = Array.from(mauMap.entries()).map(([month, counts]) => {
      const [y, m] = month.split("-");
      const label = `${parseInt(m)}월`;
      return { month, label, ...counts };
    });

    return NextResponse.json({
      dau,
      mau,
      todayDAU: Number(todayTotal[0]?.count || 0),
      thisMonthMAU: Number(monthTotal[0]?.count || 0),
    });
  } catch (error) {
    console.error("Error fetching active users:", error);
    return NextResponse.json(
      { error: "Failed to fetch active users stats" },
      { status: 500 }
    );
  }
}
