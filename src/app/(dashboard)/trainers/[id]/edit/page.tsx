import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { TrainerForm } from "@/components/forms/trainer-form";

async function getTrainer(id: string) {
  return prisma.trainerProfile.findUnique({
    where: { id },
    select: {
      id: true,
      bio: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
}

export default async function EditTrainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user || !session.user.roles.some(r => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const trainer = await getTrainer(id);

  if (!trainer) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="트레이너 수정"
        description={`${trainer.user.name} 정보를 수정합니다.`}
      />
      <TrainerForm initialData={trainer} />
    </div>
  );
}
