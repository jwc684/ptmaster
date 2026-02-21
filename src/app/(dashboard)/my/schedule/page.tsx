import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Building2 } from "lucide-react";
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
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">예약</h1>
          <p className="text-sm text-muted-foreground">PT 예약 내역</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="font-medium">예약 내역이 없습니다</p>
              <p className="text-sm text-muted-foreground mt-1">
                센터를 등록하면 예약 내역을 확인할 수 있습니다.
              </p>
            </div>
            <Button asChild>
              <Link href="/my">
                <Building2 className="h-4 w-4 mr-2" />
                센터 선택하기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serialized = data.schedules.map((s) => ({
    ...s,
    scheduledAt: s.scheduledAt.toISOString(),
  }));

  return <MyScheduleClient schedules={serialized} remainingPT={data.remainingPT} />;
}
