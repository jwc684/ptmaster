import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MemberForm } from "@/components/forms/member-form";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";

async function getTrainers(shopId: string | null, isSuperAdmin: boolean) {
  return prisma.trainerProfile.findMany({
    where: buildShopFilter(shopId, isSuperAdmin),
    select: {
      id: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export default async function NewMemberPage() {
  const authResult = await getAuthWithShop();

  if (!authResult.isAuthenticated || !authResult.userRoles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect("/dashboard");
  }

  const trainers = await getTrainers(authResult.shopId, authResult.isSuperAdmin);

  return (
    <div>
      <PageHeader
        title="회원 등록"
        description="새로운 회원을 등록합니다."
      />
      <MemberForm trainers={trainers} />
    </div>
  );
}
