import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AddMemberClient } from "./add-member-client";

async function getTrainerProfile(userId: string) {
  return prisma.trainerProfile.findUnique({
    where: { userId },
    select: { id: true, shopId: true },
  });
}

async function getAvailableMembers(shopId: string) {
  return prisma.memberProfile.findMany({
    where: {
      shopId,
    },
    select: {
      id: true,
      trainerId: true,
      remainingPT: true,
      user: {
        select: { name: true, phone: true },
      },
      trainer: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export default async function AddMemberPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "TRAINER") {
    redirect("/dashboard");
  }

  const trainerProfile = await getTrainerProfile(session.user.id);
  if (!trainerProfile || !trainerProfile.shopId) {
    redirect("/dashboard");
  }

  const availableMembers = await getAvailableMembers(trainerProfile.shopId!);

  const serialized = availableMembers.map((m) => ({
    id: m.id,
    name: m.user.name,
    phone: m.user.phone,
    remainingPT: m.remainingPT,
    trainerName: m.trainer?.user?.name || null,
    isMine: m.trainerId === trainerProfile.id,
  }));

  return (
    <AddMemberClient
      members={serialized}
      trainerProfileId={trainerProfile.id}
    />
  );
}
