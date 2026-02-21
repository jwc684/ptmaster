import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { memberUpdateSchema, assignTrainerSchema } from "@/lib/validations/member";
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

    // Members can only view their own profile
    if (hasRole(authResult.userRoles, "MEMBER")) {
      const userProfile = await prisma.memberProfile.findUnique({
        where: { userId: authResult.userId },
      });
      if (userProfile?.id !== id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }
    }

    // Build shop filter for tenant isolation
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const member = await prisma.memberProfile.findFirst({
      where: { id, ...shopFilter },
      select: {
        id: true,
        qrCode: true,
        remainingPT: true,
        notes: true,
        birthDate: true,
        gender: true,
        joinDate: true,
        trainerId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        trainer: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
        attendances: {
          select: {
            id: true,
            checkInTime: true,
            notes: true,
          },
          orderBy: { checkInTime: "desc" },
          take: 10,
        },
        payments: {
          select: {
            id: true,
            amount: true,
            ptCount: true,
            status: true,
            paidAt: true,
          },
          orderBy: { paidAt: "desc" },
          take: 10,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "회원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "회원 정보를 불러오는 중 오류가 발생했습니다." },
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

    const { id } = await params;
    const body = await request.json();

    // 회원 본인이 수정 가능한 필드: kakaoNotification, name
    if (hasRole(authResult.userRoles, "MEMBER")) {
      const allowedKeys = new Set(["kakaoNotification", "name"]);
      const bodyKeys = Object.keys(body);
      const hasOnlyAllowed = bodyKeys.length > 0 && bodyKeys.every((k) => allowedKeys.has(k));

      if (!hasOnlyAllowed) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }

      if ("kakaoNotification" in body && typeof body.kakaoNotification !== "boolean") {
        return NextResponse.json({ error: "잘못된 알림 설정 값입니다." }, { status: 400 });
      }

      if ("name" in body && (typeof body.name !== "string" || body.name.trim().length === 0)) {
        return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
      }

      const memberProfile = await prisma.memberProfile.findUnique({
        where: { userId: authResult.userId },
        select: { id: true, userId: true },
      });
      if (!memberProfile || memberProfile.id !== id) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
      }

      // Update name on User model if provided
      if (body.name) {
        await prisma.user.update({
          where: { id: memberProfile.userId },
          data: { name: body.name.trim() },
        });
      }

      // Update kakaoNotification on MemberProfile if provided
      if ("kakaoNotification" in body) {
        await prisma.memberProfile.update({
          where: { id },
          data: { kakaoNotification: body.kakaoNotification },
        });
      }

      return NextResponse.json({
        message: body.name ? "이름이 변경되었습니다." : "알림 설정이 변경되었습니다.",
      });
    }

    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "TRAINER"];
    if (!authResult.userRoles.some(r => allowedRoles.includes(r))) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Build shop filter for tenant isolation
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    // 트레이너 할당만 하는 경우 (trainerId 필드만 있는 경우)
    const isTrainerAssignOnly = Object.keys(body).length === 1 && "trainerId" in body;

    if (isTrainerAssignOnly) {
      const assignData = assignTrainerSchema.safeParse(body);
      if (!assignData.success) {
        return NextResponse.json(
          { error: assignData.error.issues[0].message },
          { status: 400 }
        );
      }

      // TRAINER: 자기 trainerProfileId만 지정 가능 + 같은 shopId 회원만
      if (hasRole(authResult.userRoles, "TRAINER")) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: authResult.userId },
          select: { id: true, shopId: true },
        });

        if (!trainerProfile) {
          return NextResponse.json({ error: "트레이너 프로필을 찾을 수 없습니다." }, { status: 403 });
        }

        if (assignData.data.trainerId !== trainerProfile.id) {
          return NextResponse.json({ error: "자신의 회원으로만 배정할 수 있습니다." }, { status: 403 });
        }

        const memberProfile = await prisma.memberProfile.findUnique({
          where: { id },
          select: { shopId: true },
        });

        if (!memberProfile || memberProfile.shopId !== trainerProfile.shopId) {
          return NextResponse.json({ error: "같은 PT샵의 회원만 배정할 수 있습니다." }, { status: 403 });
        }
      }

      // Verify member belongs to the same shop (for ADMIN)
      const targetMember = await prisma.memberProfile.findFirst({
        where: { id, ...shopFilter },
        select: { id: true },
      });
      if (!targetMember) {
        return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
      }

      const updatedProfile = await prisma.memberProfile.update({
        where: { id },
        data: { trainerId: assignData.data.trainerId },
        select: {
          id: true,
          trainerId: true,
          user: { select: { name: true } },
        },
      });

      return NextResponse.json({
        message: "트레이너가 배정되었습니다.",
        member: updatedProfile,
      });
    }

    // 전체 회원 수정은 ADMIN/SUPER_ADMIN만 허용
    if (!hasRole(authResult.userRoles, "ADMIN", "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const validatedData = memberUpdateSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const member = await prisma.memberProfile.findFirst({
      where: { id, ...shopFilter },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "회원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { name, email, phone, password, birthDate, gender, trainerId, remainingPT, notes } =
      validatedData.data;

    // Check if email is being changed and if it's already taken
    if (email !== member.user.email) {
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

    // Update user and profile
    await prisma.user.update({
      where: { id: member.userId },
      data: {
        name,
        email,
        phone,
        ...(password && { password: await bcrypt.hash(password, 12) }),
      },
    });

    const updatedProfile = await prisma.memberProfile.update({
      where: { id },
      data: {
        trainerId: trainerId || null,
        remainingPT: remainingPT ?? member.remainingPT,
        notes,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
      },
      select: {
        id: true,
        remainingPT: true,
        notes: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        trainer: {
          select: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      message: "회원 정보가 수정되었습니다.",
      member: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "회원 정보 수정 중 오류가 발생했습니다." },
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

    // Build shop filter for tenant isolation
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const member = await prisma.memberProfile.findFirst({
      where: { id, ...shopFilter },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "회원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 회원 삭제 (통계 데이터인 Payment, Attendance는 보존 - SetNull로 연결 해제)
    // Schedule은 cascade로 삭제, Attendance/Payment의 memberProfileId는 null로 변경
    await prisma.user.delete({
      where: { id: member.userId },
    });

    return NextResponse.json({
      message: "회원이 삭제되었습니다. (결제/출석 기록은 보존됩니다)",
    });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      { error: "회원 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
