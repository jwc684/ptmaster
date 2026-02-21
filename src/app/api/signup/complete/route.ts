import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  shopId: z.string().min(1),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, shopId: true },
    });

    if (!user || user.role !== "MEMBER" || user.shopId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { shopId, name } = result.data;

    const shop = await prisma.pTShop.findUnique({
      where: { id: shopId, isActive: true },
    });
    if (!shop) {
      return NextResponse.json({ error: "유효하지 않은 센터입니다." }, { status: 400 });
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let qrCode = "";
    for (let i = 0; i < 12; i++) {
      qrCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { shopId, name },
      });

      await tx.memberProfile.create({
        data: {
          userId: user.id,
          shopId,
          qrCode,
          remainingPT: 0,
        },
      });
    });

    return NextResponse.json({ message: "가입이 완료되었습니다." });
  } catch (error) {
    console.error("[Signup Complete] Error:", error);
    return NextResponse.json({ error: "가입 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
