import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trainerSchema } from "@/lib/validations/trainer";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const trainers = await prisma.trainerProfile.findMany({
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
        members: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(trainers);
  } catch (error) {
    console.error("Error fetching trainers:", error);
    return NextResponse.json(
      { error: "트레이너 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = trainerSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password, bio } = validatedData.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = password
      ? await bcrypt.hash(password, 12)
      : await bcrypt.hash("temp1234", 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "TRAINER",
        trainerProfile: {
          create: {
            bio,
          },
        },
      },
      include: {
        trainerProfile: true,
      },
    });

    return NextResponse.json(
      {
        message: "트레이너가 등록되었습니다.",
        trainer: user.trainerProfile,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating trainer:", error);
    return NextResponse.json(
      { error: "트레이너 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
