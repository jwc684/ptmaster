import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { z } from "zod";

const updateAdminSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다.").optional(),
  email: z.string().email("올바른 이메일 주소를 입력해주세요.").optional(),
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다.").optional(),
  phone: z.string().optional().nullable(),
});

// GET: 단일 관리자 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (authResult.userRole !== "ADMIN" && !authResult.isSuperAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const admin = await prisma.user.findFirst({
      where: {
        id,
        role: "ADMIN",
        ...shopFilter,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        shopId: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "관리자를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error("Error fetching admin:", error);
    return NextResponse.json(
      { error: "관리자 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: 관리자 정보 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (authResult.userRole !== "ADMIN" && !authResult.isSuperAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateAdminSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    // 관리자 존재 확인 (shop 필터 적용)
    const existingAdmin = await prisma.user.findFirst({
      where: {
        id,
        role: "ADMIN",
        ...shopFilter,
      },
    });

    if (!existingAdmin) {
      return NextResponse.json({ error: "관리자를 찾을 수 없습니다." }, { status: 404 });
    }

    const { name, email, password, phone } = validatedData.data;

    // 이메일 변경 시 중복 확인
    if (email && email !== existingAdmin.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: "이미 등록된 이메일입니다." },
          { status: 400 }
        );
      }
    }

    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedAdmin = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        shopId: true,
      },
    });

    return NextResponse.json({
      message: "관리자 정보가 수정되었습니다.",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json(
      { error: "관리자 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 관리자 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (authResult.userRole !== "ADMIN" && !authResult.isSuperAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;

    // 자기 자신 삭제 방지
    if (authResult.userId === id) {
      return NextResponse.json(
        { error: "자기 자신은 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    // 관리자 존재 확인 (shop 필터 적용)
    const admin = await prisma.user.findFirst({
      where: {
        id,
        role: "ADMIN",
        ...shopFilter,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "관리자를 찾을 수 없습니다." }, { status: 404 });
    }

    // 해당 샵의 마지막 관리자 삭제 방지
    const adminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        shopId: admin.shopId,
      },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "최소 1명의 관리자가 필요합니다." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "관리자가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return NextResponse.json(
      { error: "관리자 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
