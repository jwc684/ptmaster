import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, testDbConnection } from "@/lib/prisma";
import { registerApiSchema } from "@/lib/validations/auth";
import { Prisma } from "@prisma/client";

function generateQRCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // 타임스탬프 추가로 충돌 방지
  result += Date.now().toString(36).slice(-4).toUpperCase();
  return result.slice(0, 12);
}

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

    // 6. 사용자 생성 (QR 코드 충돌 시 재시도)
    let user;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        user = await prisma.user.create({
          data: {
            name,
            email,
            phone,
            password: hashedPassword,
            role: "MEMBER",
            memberProfile: {
              create: {
                qrCode: generateQRCode(),
              },
            },
          },
          include: {
            memberProfile: true,
          },
        });
        break; // 성공 시 루프 종료
      } catch (createError) {
        // Prisma unique constraint 에러 (P2002)
        if (
          createError instanceof Prisma.PrismaClientKnownRequestError &&
          createError.code === "P2002"
        ) {
          const target = createError.meta?.target as string[] | undefined;
          if (target?.includes("qrCode")) {
            attempts++;
            console.log(`QR code collision, attempt ${attempts}/${maxAttempts}`);
            if (attempts >= maxAttempts) {
              throw new Error("QR 코드 생성에 실패했습니다. 다시 시도해주세요.");
            }
            continue;
          }
          // 이메일 중복 (이미 위에서 체크했지만 race condition 대비)
          if (target?.includes("email")) {
            return NextResponse.json(
              { error: "이미 등록된 이메일입니다." },
              { status: 400 }
            );
          }
        }
        throw createError;
      }
    }

    if (!user) {
      throw new Error("사용자 생성에 실패했습니다.");
    }

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
      console.error("Prisma error code:", error.code, "meta:", error.meta);
      return NextResponse.json(
        {
          error: "데이터베이스 오류가 발생했습니다.",
          code: error.code
        },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("Prisma initialization error:", error.message);
      return NextResponse.json(
        {
          error: "서버 초기화 오류가 발생했습니다.",
          code: "PRISMA_INIT_ERROR"
        },
        { status: 500 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다.", details: errorMessage },
      { status: 500 }
    );
  }
}
