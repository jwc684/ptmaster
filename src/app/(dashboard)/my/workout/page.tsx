import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkoutClient } from "./workout-client";

async function getWorkoutData(userId: string) {
  const memberProfile = await prisma.memberProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!memberProfile) return null;

  const [activeSession, recentSessions] = await Promise.all([
    prisma.workoutSession.findFirst({
      where: {
        memberProfileId: memberProfile.id,
        status: "IN_PROGRESS",
      },
      include: {
        sets: {
          include: {
            exercise: { select: { id: true, name: true, type: true } },
          },
          orderBy: [{ order: "asc" }, { setNumber: "asc" }],
        },
      },
    }),
    prisma.workoutSession.findMany({
      where: {
        memberProfileId: memberProfile.id,
        status: "COMPLETED",
      },
      include: {
        sets: {
          include: {
            exercise: { select: { id: true, name: true, type: true } },
          },
          orderBy: [{ order: "asc" }, { setNumber: "asc" }],
        },
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    memberProfileId: memberProfile.id,
    activeSession: activeSession
      ? {
          ...activeSession,
          date: activeSession.date.toISOString(),
          startedAt: activeSession.startedAt.toISOString(),
          completedAt: activeSession.completedAt?.toISOString() ?? null,
          createdAt: activeSession.createdAt.toISOString(),
          sets: activeSession.sets.map((s) => ({
            ...s,
            createdAt: s.createdAt.toISOString(),
          })),
        }
      : null,
    recentSessions: recentSessions.map((s) => ({
      ...s,
      date: s.date.toISOString(),
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      sets: s.sets.map((set) => ({
        ...set,
        createdAt: set.createdAt.toISOString(),
      })),
    })),
  };
}

export default async function WorkoutPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getWorkoutData(session.user.id);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">회원 프로필이 없습니다.</p>
      </div>
    );
  }

  return <WorkoutClient initialData={data} />;
}
