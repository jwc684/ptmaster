import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, requireRoles } from "@/lib/shop-utils";
import type { ActionType, UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const authResult = await getAuthWithShop();

  const roleError = requireRoles(authResult, ["SUPER_ADMIN"]);
  if (roleError) {
    return NextResponse.json({ error: roleError }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  // Filters
  const shopId = searchParams.get("shopId");
  const userId = searchParams.get("userId");
  const userRole = searchParams.get("userRole") as UserRole | null;
  const actionType = searchParams.get("actionType") as ActionType | null;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const search = searchParams.get("search");

  // Build where clause
  const where: Record<string, unknown> = {};

  if (shopId) {
    where.shopId = shopId;
  }

  if (userId) {
    where.userId = userId;
  }

  if (userRole) {
    where.userRole = userRole;
  }

  if (actionType) {
    where.actionType = actionType;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, Date>).lte = end;
    }
  }

  if (search) {
    where.OR = [
      { userName: { contains: search, mode: "insensitive" } },
      { page: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          userName: true,
          userRole: true,
          shopId: true,
          shopName: true,
          actionType: true,
          page: true,
          action: true,
          targetId: true,
          targetType: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      prisma.accessLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch access logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch access logs" },
      { status: 500 }
    );
  }
}
