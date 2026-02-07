import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SCHEDULED: { label: "예정", variant: "default" },
  COMPLETED: { label: "완료", variant: "secondary" },
  CANCELLED: { label: "취소", variant: "destructive" },
  NO_SHOW: { label: "노쇼", variant: "outline" },
};

async function getScheduleData(userId: string) {
  const member = await prisma.memberProfile.findUnique({
    where: { userId },
    select: { id: true },
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
    },
    orderBy: { scheduledAt: "desc" },
  });

  return schedules;
}

export default async function MySchedulePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const schedules = await getScheduleData(session.user.id);

  if (schedules === null) {
    redirect("/dashboard");
  }

  const now = new Date();
  const upcoming = schedules.filter(
    (s) => s.status === "SCHEDULED" && s.scheduledAt >= now
  );
  const past = schedules.filter(
    (s) => s.status !== "SCHEDULED" || s.scheduledAt < now
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">예약 관리</h1>
        <p className="text-sm text-muted-foreground">PT 스케줄을 확인하세요</p>
      </div>

      {/* Upcoming Schedules */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            예정된 스케줄
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map((schedule) => {
                const statusInfo = STATUS_LABELS[schedule.status];
                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {schedule.scheduledAt.toLocaleDateString("ko-KR", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.scheduledAt.toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {schedule.trainer.user.name} 트레이너
                      </p>
                      {schedule.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {schedule.notes}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusInfo?.variant || "default"}>
                      {statusInfo?.label || schedule.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              예정된 스케줄이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Past Schedules */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">지난 스케줄</CardTitle>
        </CardHeader>
        <CardContent>
          {past.length > 0 ? (
            <div className="space-y-3">
              {past.map((schedule) => {
                const statusInfo = STATUS_LABELS[schedule.status];
                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {schedule.scheduledAt.toLocaleDateString("ko-KR", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.scheduledAt.toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {schedule.trainer.user.name} 트레이너
                      </p>
                    </div>
                    <Badge variant={statusInfo?.variant || "default"}>
                      {statusInfo?.label || schedule.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              지난 스케줄이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
