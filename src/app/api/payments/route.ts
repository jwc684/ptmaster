import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validations/payment";
import { getAuthWithShop, buildShopFilter, requireShopContext } from "@/lib/shop-utils";

export async function GET() {
  try {
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can access payment list
    if (!["ADMIN", "SUPER_ADMIN"].includes(authResult.userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Build shop filter
    const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

    const payments = await prisma.payment.findMany({
      where: shopFilter,
      select: {
        id: true,
        amount: true,
        ptCount: true,
        status: true,
        description: true,
        paidAt: true,
        shopId: true,
        memberProfile: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
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
    const authResult = await getAuthWithShop();

    if (!authResult.isAuthenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can create payments
    if (!["ADMIN", "SUPER_ADMIN"].includes(authResult.userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // Require shop context for creating payments
    const shopError = requireShopContext(authResult);
    if (shopError) {
      return NextResponse.json({ error: shopError }, { status: 400 });
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

    // Verify member belongs to same shop
    const member = await prisma.memberProfile.findFirst({
      where: {
        id: memberProfileId,
        shopId: authResult.shopId!,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "해당 회원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Create payment and add PT count to member in transaction
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          memberProfileId,
          amount,
          ptCount,
          description,
          shopId: authResult.shopId!,
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
        message: `${payment.memberProfile?.user.name ?? "회원"}님 PT ${ptCount}회 결제 완료`,
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
