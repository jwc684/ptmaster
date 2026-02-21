import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { MemberForm } from "@/components/forms/member-form";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";

async function getMember(id: string) {
  const member = await prisma.memberProfile.findUnique({
    where: { id },
    select: {
      id: true,
      trainerId: true,
      remainingPT: true,
      notes: true,
      birthDate: true,
      gender: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!member) return null;

  // birthDate를 문자열 형식으로 변환
  return {
    ...member,
    birthDate: member.birthDate ? member.birthDate.toISOString().split("T")[0] : null,
  };
}

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

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authResult = await getAuthWithShop();
  if (!authResult.isAuthenticated || !authResult.userRoles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [member, trainers] = await Promise.all([
    getMember(id),
    getTrainers(authResult.shopId, authResult.isSuperAdmin),
  ]);

  if (!member) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title="회원 정보 수정"
        description={`${member.user.name}님의 정보를 수정합니다.`}
      />
      <MemberForm initialData={member} trainers={trainers} />
    </div>
  );
}
