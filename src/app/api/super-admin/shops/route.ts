import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop } from "@/lib/shop-utils";

// GET /api/super-admin/shops - List all PT shops
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!authResult.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    const includeInactive = searchParams.get("includeInactive") === "true";

    const shops = await prisma.pTShop.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: "desc" },
      include: includeStats
        ? {
            _count: {
              select: {
                users: true,
                memberProfiles: true,
                trainerProfiles: true,
                payments: true,
              },
            },
          }
        : undefined,
    });

    // If stats are requested, calculate additional metrics
    if (includeStats) {
      const shopsWithStats = await Promise.all(
        shops.map(async (shop) => {
          const totalRevenue = await prisma.payment.aggregate({
            where: { shopId: shop.id, status: "COMPLETED" },
            _sum: { amount: true },
          });

          const monthlyRevenue = await prisma.payment.aggregate({
            where: {
              shopId: shop.id,
              status: "COMPLETED",
              paidAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
            _sum: { amount: true },
          });

          return {
            ...shop,
            stats: {
              totalRevenue: totalRevenue._sum.amount || 0,
              monthlyRevenue: monthlyRevenue._sum.amount || 0,
            },
          };
        })
      );

      return NextResponse.json(shopsWithStats);
    }

    return NextResponse.json(shops);
  } catch (error) {
    console.error("Error fetching shops:", error);
    return NextResponse.json(
      { error: "Failed to fetch shops" },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/shops - Create a new PT shop
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!authResult.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, description, address, phone, email, logo } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    const existingShop = await prisma.pTShop.findUnique({
      where: { slug },
    });

    if (existingShop) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    }

    const shop = await prisma.pTShop.create({
      data: {
        name,
        slug,
        description,
        address,
        phone,
        email,
        logo,
        isActive: true,
      },
    });

    return NextResponse.json(shop, { status: 201 });
  } catch (error) {
    console.error("Error creating shop:", error);
    return NextResponse.json(
      { error: "Failed to create shop" },
      { status: 500 }
    );
  }
}
