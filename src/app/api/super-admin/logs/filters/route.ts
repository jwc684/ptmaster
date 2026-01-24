import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, requireRoles } from "@/lib/shop-utils";

export async function GET() {
  const authResult = await getAuthWithShop();

  const roleError = requireRoles(authResult, ["SUPER_ADMIN"]);
  if (roleError) {
    return NextResponse.json({ error: roleError }, { status: 403 });
  }

  try {
    const shops = await prisma.pTShop.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    const roles = ["SUPER_ADMIN", "ADMIN", "TRAINER", "MEMBER"];
    const actionTypes = [
      { value: "PAGE_VIEW", label: "페이지 조회" },
      { value: "CREATE", label: "생성" },
      { value: "UPDATE", label: "수정" },
      { value: "DELETE", label: "삭제" },
      { value: "LOGIN", label: "로그인" },
      { value: "LOGOUT", label: "로그아웃" },
      { value: "API_CALL", label: "API 호출" },
    ];

    return NextResponse.json({
      shops,
      roles,
      actionTypes,
    });
  } catch (error) {
    console.error("Failed to fetch filter options:", error);
    return NextResponse.json(
      { error: "Failed to fetch filter options" },
      { status: 500 }
    );
  }
}
