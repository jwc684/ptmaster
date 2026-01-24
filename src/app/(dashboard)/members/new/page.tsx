import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MemberForm } from "@/components/forms/member-form";

async function getTrainers() {
  return prisma.trainerProfile.findMany({
    select: {
      id: true,
      user: { select: { name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export default async function NewMemberPage() {
  const session = await auth();

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const trainers = await getTrainers();

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
