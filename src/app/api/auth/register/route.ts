import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, testDbConnection } from "@/lib/prisma";
import { registerApiSchema } from "@/lib/validations/auth";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    // 1. 요청 본문 파싱
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다." },
        { status: 400 }
      );
    }

    // 2. 데이터 검증
    const validatedData = registerApiSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = validatedData.data;

    // 3. 데이터베이스 연결 확인
    const dbTest = await testDbConnection();
    if (!dbTest.ok) {
      console.error("Database connection failed:", dbTest.error);
      return NextResponse.json(
        {
          error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          code: "DB_CONNECTION_ERROR"
        },
        { status: 500 }
      );
    }

    // 4. 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 400 }
      );
    }

    // 5. 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 12);

    // 6. 사용자 생성
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "MEMBER",
        memberProfile: {
          create: {},
        },
      },
      include: {
        memberProfile: true,
      },
    });

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Prisma 에러 상세 분류
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma error code:", error.code, "meta:", error.meta, "message:", error.message);

      // P2002: Unique constraint violation
      if (error.code === "P2002") {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("email")) {
          return NextResponse.json(
            { error: "이미 등록된 이메일입니다." },
            { status: 400 }
          );
        }
      }

      // P2003: Foreign key constraint
      // P2025: Record not found
      return NextResponse.json(
        {
          error: "데이터베이스 오류가 발생했습니다.",
          code: error.code,
          details: process.env.NODE_ENV === "development" ? error.message : undefined
        },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("Prisma initialization error:", error.message);
      return NextResponse.json(
        {
          error: "서버 초기화 오류가 발생했습니다.",
          code: "PRISMA_INIT_ERROR",
          details: process.env.NODE_ENV === "development" ? error.message : undefined
        },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("Prisma validation error:", error.message);
      return NextResponse.json(
        {
          error: "데이터 유효성 검사 오류가 발생했습니다.",
          code: "PRISMA_VALIDATION_ERROR",
          details: process.env.NODE_ENV === "development" ? error.message : undefined
        },
        { status: 500 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unknown registration error:", errorMessage);
    return NextResponse.json(
      {
        error: "회원가입 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
