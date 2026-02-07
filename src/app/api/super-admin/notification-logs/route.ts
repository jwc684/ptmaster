import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, requireRoles } from "@/lib/shop-utils";

export async function GET(request: NextRequest) {
  const authResult = await getAuthWithShop();

  const roleError = requireRoles(authResult, ["SUPER_ADMIN"]);
  if (roleError) {
    return NextResponse.json({ error: roleError }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const skip = (page - 1) * limit;

  // Filters
  const success = searchParams.get("success");

  // Build where clause
  const where: Record<string, unknown> = {};

  if (success === "true") {
    where.success = true;
  } else if (success === "false") {
    where.success = false;
  }

  try {
    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
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
    console.error("Failed to fetch notification logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification logs" },
      { status: 500 }
    );
  }
}
