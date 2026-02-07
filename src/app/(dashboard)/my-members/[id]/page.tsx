import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MemberDetailClient } from "./member-detail-client";

async function getMemberDetail(memberProfileId: string, trainerId: string) {
  const member = await prisma.memberProfile.findFirst({
    where: {
      id: memberProfileId,
      trainerId,
    },
    select: {
      id: true,
      remainingPT: true,
      joinDate: true,
      notes: true,
      user: {
        select: { name: true, phone: true, email: true },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          ptCount: true,
          paidAt: true,
          description: true,
        },
        orderBy: { paidAt: "desc" },
        take: 10,
      },
      schedules: {
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          notes: true,
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });

  return member;
}

export default async function MyMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "TRAINER") {
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
  const member = await getMemberDetail(id, trainerProfile.id);

  if (!member) {
    redirect("/my-members");
  }

  // Serialize dates
  const serialized = {
    ...member,
    joinDate: member.joinDate.toISOString(),
    payments: member.payments.map((p) => ({
      ...p,
      paidAt: p.paidAt.toISOString(),
    })),
    schedules: member.schedules.map((s) => ({
      ...s,
      scheduledAt: s.scheduledAt.toISOString(),
    })),
  };

  return (
    <MemberDetailClient
      member={serialized}
      trainerProfileId={trainerProfile.id}
    />
  );
}
