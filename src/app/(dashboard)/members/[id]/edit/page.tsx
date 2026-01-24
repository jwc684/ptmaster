import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { MemberForm } from "@/components/forms/member-form";

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

async function getTrainers() {
  return prisma.trainerProfile.findMany({
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
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [member, trainers] = await Promise.all([
    getMember(id),
    getTrainers(),
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
