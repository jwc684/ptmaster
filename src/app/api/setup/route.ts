import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// 초기 설정용 엔드포인트 - 관리자가 없을 때만 생성
export async function POST(request: Request) {
  try {
    // 요청 본문에서 설정 키 확인 (보안을 위해)
    const body = await request.json();
    const { setupKey, email, password, name } = body;

    // 환경변수로 설정된 키와 비교 (없으면 기본값 사용)
    const validKey = process.env.SETUP_KEY || "ptmaster-setup-2024";
    if (setupKey !== validKey) {
      return NextResponse.json(
        { error: "Invalid setup key" },
        { status: 403 }
      );
    }

    // 이미 관리자가 있는지 확인
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "관리자가 이미 존재합니다.", adminEmail: existingAdmin.email },
        { status: 400 }
      );
    }

    // 이메일 기본값
    const adminEmail = email || "admin@ptshop.com";
    const adminPassword = password || "admin123!";
    const adminName = name || "관리자";

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      // 기존 사용자를 관리자로 업그레이드
      const updatedUser = await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "ADMIN" },
      });
      return NextResponse.json({
        message: "기존 사용자를 관리자로 업그레이드했습니다.",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
        },
      });
    }

    // 새 관리자 생성
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      message: "관리자가 생성되었습니다.",
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      credentials: {
        email: adminEmail,
        password: adminPassword,
        note: "비밀번호를 반드시 변경하세요!",
      },
    }, { status: 201 });

  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "설정 중 오류가 발생했습니다.", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

// GET으로 상태 확인
export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });

    const trainerCount = await prisma.user.count({
      where: { role: "TRAINER" },
    });

    const memberCount = await prisma.user.count({
      where: { role: "MEMBER" },
    });

    return NextResponse.json({
      setup: adminCount > 0 ? "completed" : "required",
      counts: {
        admins: adminCount,
        trainers: trainerCount,
        members: memberCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "상태 확인 실패", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
