import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, requireShopContext } from "@/lib/shop-utils";
import { hasRole } from "@/lib/role-utils";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const roleSchema = z.object({
  role: z.enum(["ADMIN", "TRAINER", "MEMBER"]),
});

// POST: Add a role to a user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const shopError = requireShopContext(authResult);
    if (shopError) {
      return NextResponse.json({ error: shopError }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, roles: true, shopId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // Non-super-admin can only manage users in their own shop
    if (!authResult.isSuperAdmin && targetUser.shopId !== authResult.shopId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Check if user already has this role
    if (targetUser.roles.includes(role as UserRole)) {
      return NextResponse.json({ error: "이미 해당 역할이 있습니다." }, { status: 400 });
    }

    // Add the role and create associated profile if needed
    const updatedUser = await prisma.$transaction(async (tx) => {
      // If adding TRAINER role, create TrainerProfile if it doesn't exist
      if (role === "TRAINER" && targetUser.shopId) {
        const existingProfile = await tx.trainerProfile.findUnique({
          where: { userId: id },
        });

        if (!existingProfile) {
          await tx.trainerProfile.create({
            data: {
              userId: id,
              shopId: targetUser.shopId,
            },
          });
        }
      }

      // If adding MEMBER role, create MemberProfile if it doesn't exist
      if (role === "MEMBER" && targetUser.shopId) {
        const existingProfile = await tx.memberProfile.findUnique({
          where: { userId: id },
        });

        if (!existingProfile) {
          await tx.memberProfile.create({
            data: {
              userId: id,
              shopId: targetUser.shopId,
              joinDate: new Date(),
            },
          });
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          roles: { push: role as UserRole },
        },
        select: {
          id: true,
          name: true,
          roles: true,
        },
      });
    });

    return NextResponse.json({
      message: `${role} 역할이 추가되었습니다.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error adding role:", error);
    return NextResponse.json(
      { error: "역할 추가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: Remove a role from a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, roles: true, shopId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // Non-super-admin can only manage users in their own shop
    if (!authResult.isSuperAdmin && targetUser.shopId !== authResult.shopId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (!targetUser.roles.includes(role as UserRole)) {
      return NextResponse.json({ error: "해당 역할이 없습니다." }, { status: 400 });
    }

    // Cannot remove the last role
    if (targetUser.roles.length <= 1) {
      return NextResponse.json({ error: "최소 하나의 역할이 필요합니다." }, { status: 400 });
    }

    const newRoles = targetUser.roles.filter((r) => r !== role);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roles: newRoles },
      select: {
        id: true,
        name: true,
        roles: true,
      },
    });

    return NextResponse.json({
      message: `${role} 역할이 제거되었습니다.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error removing role:", error);
    return NextResponse.json(
      { error: "역할 제거 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
