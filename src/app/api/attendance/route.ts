import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Get today's attendances
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendances = await prisma.attendance.findMany({
      where: {
        checkInTime: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        checkInTime: true,
        notes: true,
        memberProfile: {
          select: {
            id: true,
            remainingPT: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { checkInTime: "desc" },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "출석 기록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { qrCode, notes } = await request.json();

    if (!qrCode) {
      return NextResponse.json(
        { error: "QR 코드가 필요합니다." },
        { status: 400 }
      );
    }

    // Find member by QR code
    const member = await prisma.memberProfile.findUnique({
      where: { qrCode },
      select: {
        id: true,
        remainingPT: true,
        user: { select: { name: true } },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "유효하지 않은 QR 코드입니다." },
        { status: 404 }
      );
    }

    // Check if member has remaining PT sessions
    if (member.remainingPT <= 0) {
      return NextResponse.json(
        { error: `${member.user.name}님의 잔여 PT 횟수가 없습니다.` },
        { status: 400 }
      );
    }

    // Create attendance and deduct PT count in transaction
    const [attendance] = await prisma.$transaction([
      prisma.attendance.create({
        data: {
          memberProfileId: member.id,
          notes: notes || null,
        },
        select: {
          id: true,
          checkInTime: true,
          notes: true,
          memberProfile: {
            select: {
              id: true,
              remainingPT: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.memberProfile.update({
        where: { id: member.id },
        data: { remainingPT: { decrement: 1 } },
      }),
    ]);

    const newRemainingPT = member.remainingPT - 1;

    return NextResponse.json(
      {
        message: `${member.user.name}님 PT 출석 완료! (잔여 ${newRemainingPT}회)`,
        attendance: {
          ...attendance,
          memberProfile: {
            ...attendance.memberProfile,
            remainingPT: newRemainingPT,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating attendance:", error);
    return NextResponse.json(
      { error: "출석 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
