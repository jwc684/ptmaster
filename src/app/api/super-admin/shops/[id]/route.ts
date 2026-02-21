import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop } from "@/lib/shop-utils";
import { z } from "zod";

const updateShopSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "슬러그는 영문 소문자, 숫자, 하이픈만 사용 가능합니다.").optional(),
  description: z.string().max(500).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  logo: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/super-admin/shops/[id] - Get shop details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!authResult.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const shop = await prisma.pTShop.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            memberProfiles: true,
            trainerProfiles: true,
            payments: true,
            schedules: true,
            attendances: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get additional stats
    const totalRevenue = await prisma.payment.aggregate({
      where: { shopId: id, status: "COMPLETED" },
      _sum: { amount: true },
    });

    const monthlyRevenue = await prisma.payment.aggregate({
      where: {
        shopId: id,
        status: "COMPLETED",
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
    });

    const admins = await prisma.user.findMany({
      where: { shopId: id, roles: { has: "ADMIN" } },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...shop,
      stats: {
        totalRevenue: totalRevenue._sum.amount || 0,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
      },
      admins,
    });
  } catch (error) {
    console.error("Error fetching shop:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop" },
      { status: 500 }
    );
  }
}

// PATCH /api/super-admin/shops/[id] - Update shop
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!authResult.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateShopSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, slug, description, address, phone, email, logo, isActive } = validatedData.data;

    // Check if shop exists
    const existingShop = await prisma.pTShop.findUnique({
      where: { id },
    });

    if (!existingShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // If slug is being changed, check if new slug is available
    if (slug && slug !== existingShop.slug) {
      const slugExists = await prisma.pTShop.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "Slug already exists" },
          { status: 409 }
        );
      }
    }

    const shop = await prisma.pTShop.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(logo !== undefined && { logo }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(shop);
  } catch (error) {
    console.error("Error updating shop:", error);
    return NextResponse.json(
      { error: "Failed to update shop" },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/shops/[id] - Delete/deactivate shop
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!authResult.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hardDelete") === "true";

    // Check if shop exists
    const existingShop = await prisma.pTShop.findUnique({
      where: { id },
    });

    if (!existingShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (hardDelete) {
      // Hard delete - remove all related data
      // This is dangerous, so we add extra verification
      const { searchParams } = new URL(request.url);
      const confirmDelete = searchParams.get("confirm") === existingShop.slug;

      if (!confirmDelete) {
        return NextResponse.json(
          { error: "Please confirm deletion by passing confirm=SHOP_SLUG" },
          { status: 400 }
        );
      }

      // Delete in order to respect foreign key constraints
      await prisma.$transaction([
        prisma.attendance.deleteMany({ where: { shopId: id } }),
        prisma.schedule.deleteMany({ where: { shopId: id } }),
        prisma.payment.deleteMany({ where: { shopId: id } }),
        prisma.memberProfile.deleteMany({ where: { shopId: id } }),
        prisma.trainerProfile.deleteMany({ where: { shopId: id } }),
        prisma.user.deleteMany({ where: { shopId: id } }),
        prisma.pTShop.delete({ where: { id } }),
      ]);

      return NextResponse.json({ message: "Shop deleted permanently" });
    } else {
      // Soft delete - just deactivate
      const shop = await prisma.pTShop.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json(shop);
    }
  } catch (error) {
    console.error("Error deleting shop:", error);
    return NextResponse.json(
      { error: "Failed to delete shop" },
      { status: 500 }
    );
  }
}
