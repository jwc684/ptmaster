import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, testDbConnection } from "@/lib/prisma";
import { registerApiSchema } from "@/lib/validations/auth";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("[Register] ===== Starting registration =====");

  try {
    // Step 1: Parse request body
    console.log("[Register] Step 1: Parsing request body...");
    let body;
    try {
      body = await request.json();
      console.log("[Register] Step 1: Body parsed, email:", body?.email);
    } catch {
      console.error("[Register] Step 1: Failed to parse body");
      return NextResponse.json(
        { error: "잘못된 요청 형식입니다.", step: "parse_body" },
        { status: 400 }
      );
    }

    // Step 2: Validate data
    console.log("[Register] Step 2: Validating data...");
    const validatedData = registerApiSchema.safeParse(body);
    if (!validatedData.success) {
      console.error("[Register] Step 2: Validation failed:", validatedData.error.issues);
      return NextResponse.json(
        { error: validatedData.error.issues[0].message, step: "validation" },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = validatedData.data;
    console.log("[Register] Step 2: Validation passed for:", email);

    // Step 3: Test database connection
    console.log("[Register] Step 3: Testing database connection...");
    const dbTest = await testDbConnection();
    if (!dbTest.ok) {
      console.error("[Register] Step 3: Database connection failed:", dbTest.error);
      console.error("[Register] Step 3: Details:", dbTest.details);
      return NextResponse.json(
        {
          error: "데이터베이스 연결에 실패했습니다.",
          step: "db_connection",
          code: "DB_CONNECTION_ERROR",
          details: dbTest.details
        },
        { status: 500 }
      );
    }
    console.log("[Register] Step 3: Database connection OK");

    // Step 4: Check for existing user
    console.log("[Register] Step 4: Checking for existing user...");
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email },
      });
    } catch (findError) {
      console.error("[Register] Step 4: Error finding user:", findError);
      return NextResponse.json(
        {
          error: "사용자 확인 중 오류가 발생했습니다.",
          step: "find_user",
          details: findError instanceof Error ? findError.message : "Unknown"
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      console.log("[Register] Step 4: User already exists:", email);
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다.", step: "duplicate" },
        { status: 400 }
      );
    }
    console.log("[Register] Step 4: No existing user found");

    // Step 5: Hash password
    console.log("[Register] Step 5: Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log("[Register] Step 5: Password hashed");

    // Step 6: Create user
    console.log("[Register] Step 6: Creating user...");
    let user;
    try {
      user = await prisma.user.create({
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
      console.log("[Register] Step 6: User created successfully, id:", user.id);
    } catch (createError) {
      console.error("[Register] Step 6: Failed to create user:", createError);

      if (createError instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("[Register] Prisma error code:", createError.code);
        console.error("[Register] Prisma error meta:", createError.meta);

        if (createError.code === "P2002") {
          return NextResponse.json(
            { error: "이미 등록된 이메일입니다.", step: "create_duplicate" },
            { status: 400 }
          );
        }

        if (createError.code === "P2003") {
          return NextResponse.json(
            {
              error: "참조 오류가 발생했습니다.",
              step: "create_fk",
              code: createError.code
            },
            { status: 500 }
          );
        }
      }

      if (createError instanceof Prisma.PrismaClientValidationError) {
        console.error("[Register] Validation error - schema mismatch likely");
        return NextResponse.json(
          {
            error: "데이터 형식 오류입니다. 관리자에게 문의하세요.",
            step: "create_validation",
            code: "SCHEMA_MISMATCH"
          },
          { status: 500 }
        );
      }

      throw createError;
    }

    const duration = Date.now() - startTime;
    console.log(`[Register] ===== Registration completed in ${duration}ms =====`);

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
    const duration = Date.now() - startTime;
    console.error(`[Register] ===== Registration failed after ${duration}ms =====`);
    console.error("[Register] Unhandled error:", error);

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("[Register] Prisma initialization error - check DATABASE_URL");
      return NextResponse.json(
        {
          error: "서버 초기화 오류입니다. 관리자에게 문의하세요.",
          step: "init",
          code: "PRISMA_INIT_ERROR"
        },
        { status: 500 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "회원가입 중 오류가 발생했습니다.",
        step: "unknown",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
