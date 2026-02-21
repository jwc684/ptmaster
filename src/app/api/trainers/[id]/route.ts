import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { trainerUpdateSchema } from "@/lib/validations/trainer";
import { hasRole } from "@/lib/role-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    // Trainers can only view their own profile
    if (hasRole(authResult.userRoles, "TRAINER")) {
      const userProfile = await prisma.trainerProfile.findUnique({
        where: { userId: authResult.userId },
      });
      if (userProfile?.id !== id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const trainer = await prisma.trainerProfile.findFirst({
      where: { id, ...shopFilter },
      select: {
        id: true,
        bio: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        members: {
          select: {
            id: true,
            remainingPT: true,
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: "트레이너를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(trainer);
  } catch (error) {
    console.error("Error fetching trainer:", error);
    return NextResponse.json(
      { error: "트레이너 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = trainerUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const trainer = await prisma.trainerProfile.findFirst({
      where: { id, ...shopFilter },
      include: { user: true },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: "트레이너를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { name, email, phone, password, bio } = validatedData.data;

    // Check if email is being changed
    if (email !== trainer.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "이미 사용 중인 이메일입니다." },
          { status: 400 }
        );
      }
    }

    // Update user
    await prisma.user.update({
      where: { id: trainer.userId },
      data: {
        name,
        email,
        phone,
        ...(password && { password: await bcrypt.hash(password, 12) }),
      },
    });

    // Update profile
    const updatedProfile = await prisma.trainerProfile.update({
      where: { id },
      data: { bio },
      select: {
        id: true,
        bio: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "트레이너 정보가 수정되었습니다.",
      trainer: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating trainer:", error);
    return NextResponse.json(
      { error: "트레이너 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();
    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const trainer = await prisma.trainerProfile.findFirst({
      where: { id, ...shopFilter },
      include: { user: true, members: true },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: "트레이너를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Check if trainer has assigned members
    if (trainer.members.length > 0) {
      return NextResponse.json(
        { error: "담당 회원이 있는 트레이너는 삭제할 수 없습니다. 먼저 회원을 다른 트레이너에게 재배정해주세요." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: trainer.userId },
    });

    return NextResponse.json({
      message: "트레이너가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Error deleting trainer:", error);
    return NextResponse.json(
      { error: "트레이너 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
