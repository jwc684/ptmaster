"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

interface Schedule {
  id: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
  trainer: {
    user: { name: string };
  };
  attendance: {
    notes: string | null;
  } | null;
}

interface Props {
  schedules: Schedule[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
> = {
  SCHEDULED: { label: "예정", variant: "default", icon: Clock },
  COMPLETED: { label: "완료", variant: "secondary", icon: CheckCircle2 },
  CANCELLED: { label: "취소", variant: "destructive", icon: XCircle },
  NO_SHOW: { label: "노쇼", variant: "outline", icon: AlertCircle },
};

export function MyScheduleClient({ schedules }: Props) {
  const now = new Date().toISOString();
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

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">
            예정된 스케줄
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1">
            지난 스케줄
            {past.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {past.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
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
                    const config = STATUS_CONFIG[schedule.status];
                    return (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(schedule.scheduledAt).toLocaleDateString("ko-KR", {
                              month: "long",
                              day: "numeric",
                              weekday: "short",
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(schedule.scheduledAt).toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {schedule.trainer.user.name} 트레이너
                          </p>
                        </div>
                        <Badge variant={config?.variant || "default"}>
                          {config?.label || schedule.status}
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
        </TabsContent>

        <TabsContent value="past">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                지난 스케줄
              </CardTitle>
            </CardHeader>
            <CardContent>
              {past.length > 0 ? (
                <div className="space-y-3">
                  {past.map((schedule) => {
                    const config = STATUS_CONFIG[schedule.status];
                    const Icon = config?.icon || CheckCircle2;
                    const sharedNotes = schedule.attendance?.notes;
                    return (
                      <div
                        key={schedule.id}
                        className="py-2 border-b last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(schedule.scheduledAt).toLocaleDateString("ko-KR", {
                                  month: "long",
                                  day: "numeric",
                                  weekday: "short",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(schedule.scheduledAt).toLocaleTimeString("ko-KR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                · {schedule.trainer.user.name} 트레이너
                              </p>
                            </div>
                          </div>
                          <Badge variant={config?.variant || "secondary"}>
                            {config?.label || schedule.status}
                          </Badge>
                        </div>
                        {sharedNotes && (
                          <p className="ml-7 mt-1 text-xs text-muted-foreground">
                            📝 {sharedNotes}
                          </p>
                        )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
