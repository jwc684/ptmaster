import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validations/payment";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      select: {
        id: true,
        amount: true,
        ptCount: true,
        status: true,
        description: true,
        paidAt: true,
        memberProfile: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 50,
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "결제 목록을 불러오는 중 오류가 발생했습니다." },
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
    const validatedData = paymentSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const { memberProfileId, amount, ptCount, description } = validatedData.data;

    // Create payment and add PT count to member in transaction
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          memberProfileId,
          amount,
          ptCount,
          description,
        },
        select: {
          id: true,
          amount: true,
          ptCount: true,
          paidAt: true,
          memberProfile: {
            select: {
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.memberProfile.update({
        where: { id: memberProfileId },
        data: { remainingPT: { increment: ptCount } },
      }),
    ]);

    return NextResponse.json(
      {
        message: `${payment.memberProfile.user.name}님 PT ${ptCount}회 결제 완료`,
        payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "결제 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
