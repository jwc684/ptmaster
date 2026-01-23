import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScheduleView } from "@/components/schedule/schedule-view";

async function getTrainerMembers(userId: string) {
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      members: {
        select: {
          id: true,
          remainingPT: true,
          user: { select: { name: true, phone: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
  return trainerProfile;
}

export default async function SchedulePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // 트레이너와 관리자만 접근 가능
  if (session.user.role === "MEMBER") {
    redirect("/my");
  }

  const trainerData = await getTrainerMembers(session.user.id);

  return (
    <ScheduleView
      members={trainerData?.members || []}
      trainerId={trainerData?.id}
      isAdmin={session.user.role === "ADMIN"}
    />
  );
}
