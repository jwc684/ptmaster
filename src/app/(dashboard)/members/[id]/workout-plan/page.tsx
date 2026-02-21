import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/role-utils";
import { WorkoutPlanForm } from "@/components/members/workout-plan-form";

export default async function AdminWorkoutPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user || !hasRole(session.user.roles, "ADMIN", "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const member = await prisma.memberProfile.findFirst({
    where: { id },
    select: {
      id: true,
      user: { select: { name: true } },
    },
  });

  if (!member) {
    redirect("/members");
  }

  return (
    <WorkoutPlanForm
      memberProfileId={member.id}
      memberName={member.user.name}
      backHref={`/members/${member.id}`}
    />
  );
}
