import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MyMembersClient } from "./my-members-client";

async function getTrainerProfile(userId: string) {
  return prisma.trainerProfile.findUnique({
    where: { userId },
    select: { id: true, shopId: true },
  });
}

async function getMyMembers(trainerId: string) {
  return prisma.memberProfile.findMany({
    where: { trainerId },
    select: {
      id: true,
      remainingPT: true,
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
      attendances: {
        select: { checkInTime: true },
        orderBy: { checkInTime: "desc" },
        take: 1,
      },
    },
    orderBy: { user: { name: "asc" } },
  });
}

async function getShopMembers(shopId: string, trainerProfileId: string) {
  return prisma.memberProfile.findMany({
    where: {
      shopId,
      trainerId: { not: trainerProfileId },
    },
    select: {
      id: true,
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

export default async function MyMembersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "TRAINER") {
    redirect("/dashboard");
  }

  const trainerProfile = await getTrainerProfile(session.user.id);
  if (!trainerProfile || !trainerProfile.shopId) {
    redirect("/dashboard");
  }

  const [members, shopMembers] = await Promise.all([
    getMyMembers(trainerProfile.id),
    getShopMembers(trainerProfile.shopId!, trainerProfile.id),
  ]);

  // Serialize dates for client component
  const serializedMembers = members.map((m) => ({
    ...m,
    attendances: m.attendances.map((a) => ({
      checkInTime: a.checkInTime.toISOString(),
    })),
  }));

  const serializedShopMembers = shopMembers.map((m) => ({
    id: m.id,
    name: m.user.name,
    phone: m.user.phone,
    trainerName: m.trainer?.user?.name || null,
  }));

  return (
    <MyMembersClient
      members={serializedMembers}
      shopMembers={serializedShopMembers}
      trainerProfileId={trainerProfile.id}
    />
  );
}
