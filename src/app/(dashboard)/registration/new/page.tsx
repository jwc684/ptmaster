import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { RegistrationForm } from "@/components/forms/registration-form";

async function getMembers() {
  return prisma.memberProfile.findMany({
    select: {
      id: true,
      remainingPT: true,
      user: { select: { name: true, phone: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
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

export default async function NewRegistrationPage() {
  const session = await auth();

  if (!session?.user || !session.user.roles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect("/dashboard");
  }

  const [members, trainers] = await Promise.all([getMembers(), getTrainers()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="PT 등록"
        description="회원에게 PT를 등록합니다"
      />

      <RegistrationForm members={members} trainers={trainers} />
    </div>
  );
}
