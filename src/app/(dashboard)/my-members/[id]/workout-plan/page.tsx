import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkoutPlanForm } from "@/components/members/workout-plan-form";

export default async function TrainerWorkoutPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("TRAINER")) {
    redirect("/dashboard");
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!trainerProfile) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const member = await prisma.memberProfile.findFirst({
    where: {
      id,
      trainerId: trainerProfile.id,
    },
    select: {
      id: true,
      user: { select: { name: true } },
    },
  });

  if (!member) {
    redirect("/my-members");
  }

  return (
    <WorkoutPlanForm
      memberProfileId={member.id}
      memberName={member.user.name}
      backHref={`/my-members/${member.id}`}
    />
  );
}
