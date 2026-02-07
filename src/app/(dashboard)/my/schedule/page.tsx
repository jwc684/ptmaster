import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MyScheduleClient } from "./my-schedule-client";

async function getScheduleData(userId: string) {
  const member = await prisma.memberProfile.findUnique({
    where: { userId },
    select: { id: true, remainingPT: true },
  });

  if (!member) return null;

  const schedules = await prisma.schedule.findMany({
    where: { memberProfileId: member.id },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      notes: true,
      trainer: {
        select: {
          user: { select: { name: true } },
        },
      },
      attendance: {
        select: {
          notes: true,
          remainingPTAfter: true,
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  return { schedules, remainingPT: member.remainingPT };
}

export default async function MySchedulePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getScheduleData(session.user.id);

  if (data === null) {
    redirect("/dashboard");
  }

  const serialized = data.schedules.map((s) => ({
    ...s,
    scheduledAt: s.scheduledAt.toISOString(),
  }));

  return <MyScheduleClient schedules={serialized} remainingPT={data.remainingPT} />;
}
