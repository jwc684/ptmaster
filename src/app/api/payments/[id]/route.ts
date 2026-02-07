import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePaymentSchema = z.object({
  amount: z.number().min(0, "금액은 0 이상이어야 합니다.").optional(),
  ptCount: z.number().min(1, "PT 횟수는 1회 이상이어야 합니다.").optional(),
  description: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
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
    });

    if (!payment) {
      return NextResponse.json(
        { error: "결제 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "결제 내역을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updatePaymentSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: validatedData.error.issues[0].message },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { memberProfile: true },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "결제 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const { amount, ptCount, description } = validatedData.data;

    // PT 횟수가 변경된 경우 회원의 잔여 PT도 조정
    if (ptCount !== undefined && ptCount !== payment.ptCount) {
      const ptDifference = ptCount - payment.ptCount;

      if (payment.memberProfileId) {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id },
            data: {
              ...(amount !== undefined && { amount }),
              ptCount,
              ...(description !== undefined && { description }),
            },
          }),
          prisma.memberProfile.update({
            where: { id: payment.memberProfileId },
            data: { remainingPT: { increment: ptDifference } },
          }),
        ]);
      } else {
        await prisma.payment.update({
          where: { id },
          data: {
            ...(amount !== undefined && { amount }),
            ptCount,
            ...(description !== undefined && { description }),
          },
        });
      }
    } else {
      await prisma.payment.update({
        where: { id },
        data: {
          ...(amount !== undefined && { amount }),
          ...(ptCount !== undefined && { ptCount }),
          ...(description !== undefined && { description }),
        },
      });
    }

    return NextResponse.json({
      message: "결제 내역이 수정되었습니다.",
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "결제 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { memberProfile: true },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "결제 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 결제 삭제 시 PT 횟수도 차감 (트랜잭션)
    if (payment.memberProfileId) {
      await prisma.$transaction([
        prisma.payment.delete({
          where: { id },
        }),
        prisma.memberProfile.update({
          where: { id: payment.memberProfileId },
          data: { remainingPT: { decrement: payment.ptCount } },
        }),
      ]);
    } else {
      await prisma.payment.delete({
        where: { id },
      });
    }

    return NextResponse.json({
      message: "결제 내역이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "결제 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
