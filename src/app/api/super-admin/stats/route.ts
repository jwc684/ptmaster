import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop } from "@/lib/shop-utils";

// GET /api/super-admin/stats - Get overall platform statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!authResult.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get overall counts
    const [
      totalShops,
      activeShops,
      totalUsers,
      totalMembers,
      totalTrainers,
      totalAdmins,
      totalPayments,
      totalAttendances,
    ] = await Promise.all([
      prisma.pTShop.count(),
      prisma.pTShop.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
      prisma.memberProfile.count(),
      prisma.trainerProfile.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.payment.count({ where: { status: "COMPLETED" } }),
      prisma.attendance.count(),
    ]);

    // Get revenue statistics
    const totalRevenue = await prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          paidAt: { gte: thisMonthStart },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    // Get shop rankings by revenue
    const shopRevenues = await prisma.payment.groupBy({
      by: ["shopId"],
      where: { status: "COMPLETED" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    const topShops = await Promise.all(
      shopRevenues
        .filter((item) => item.shopId !== null)
        .map(async (item) => {
          const shop = await prisma.pTShop.findUnique({
            where: { id: item.shopId! },
            select: { id: true, name: true, slug: true },
          });
          return {
            shop,
            totalRevenue: item._sum.amount || 0,
          };
        })
    );

    // Get monthly revenue trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      });

      const newMembers = await prisma.memberProfile.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      });

      monthlyTrend.push({
        month: monthStart.toISOString().slice(0, 7),
        revenue: revenue._sum.amount || 0,
        newMembers,
      });
    }

    return NextResponse.json({
      overview: {
        totalShops,
        activeShops,
        totalUsers,
        totalMembers,
        totalTrainers,
        totalAdmins,
        totalPayments,
        totalAttendances,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        thisMonth: thisMonthRevenue._sum.amount || 0,
        lastMonth: lastMonthRevenue._sum.amount || 0,
        growth:
          lastMonthRevenue._sum.amount && lastMonthRevenue._sum.amount > 0
            ? (((thisMonthRevenue._sum.amount || 0) - lastMonthRevenue._sum.amount) /
                lastMonthRevenue._sum.amount) *
              100
            : 0,
      },
      topShops,
      monthlyTrend,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
