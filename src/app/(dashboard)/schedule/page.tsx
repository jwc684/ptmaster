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
          trainer: {
            select: {
              id: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
  return trainerProfile;
}

async function getAllMembersWithTrainer() {
  // 관리자용: 트레이너가 배정된 모든 회원 조회
  const members = await prisma.memberProfile.findMany({
    where: {
      trainerId: { not: null },
    },
    select: {
      id: true,
      remainingPT: true,
      user: { select: { name: true, phone: true } },
      trainer: {
        select: {
          id: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });
  return members;
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

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  if (isAdmin) {
    // 관리자/슈퍼관리자: 트레이너가 배정된 모든 회원
    const members = await getAllMembersWithTrainer();
    return (
      <ScheduleView
        members={members}
        isAdmin={true}
        tableView={isSuperAdmin}
      />
    );
  } else {
    // 트레이너: 자신의 회원만
    const trainerData = await getTrainerMembers(session.user.id);
    return (
      <ScheduleView
        members={trainerData?.members || []}
        trainerId={trainerData?.id}
        isAdmin={false}
      />
    );
  }
}
