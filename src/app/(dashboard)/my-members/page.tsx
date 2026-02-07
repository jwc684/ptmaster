import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

async function getOrCreateInviteUrl(trainerId: string, shopId: string, userId: string) {
  // Find existing reusable invite for this trainer
  const existing = await prisma.invitation.findFirst({
    where: {
      createdBy: userId,
      reusable: true,
      role: "MEMBER",
      shopId,
      expiresAt: { gt: new Date() },
    },
  });

  if (existing) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
    return `${appUrl}/invite/${existing.token}`;
  }

  // Create new reusable invite
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  await prisma.invitation.create({
    data: {
      token,
      role: "MEMBER",
      shopId,
      reusable: true,
      metadata: { trainerId } as Prisma.InputJsonValue,
      expiresAt,
      createdBy: userId,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
  return `${appUrl}/invite/${token}`;
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

  const [members, inviteUrl] = await Promise.all([
    getMyMembers(trainerProfile.id),
    getOrCreateInviteUrl(trainerProfile.id, trainerProfile.shopId, session.user.id),
  ]);

  // Serialize dates for client component
  const serializedMembers = members.map((m) => ({
    ...m,
    attendances: m.attendances.map((a) => ({
      checkInTime: a.checkInTime.toISOString(),
    })),
  }));

  return (
    <MyMembersClient
      members={serializedMembers}
      trainerProfileId={trainerProfile.id}
      inviteUrl={inviteUrl}
    />
  );
}
