import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
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
    await prisma.$transaction([
      prisma.payment.delete({
        where: { id },
      }),
      prisma.memberProfile.update({
        where: { id: payment.memberProfileId },
        data: { remainingPT: { decrement: payment.ptCount } },
      }),
    ]);

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
