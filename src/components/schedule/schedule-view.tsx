"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, addDays, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Member {
  id: string;
  remainingPT: number;
  user: { name: string; phone: string | null };
}

interface Schedule {
  id: string;
  scheduledAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes: string | null;
  memberProfile: {
    id: string;
    remainingPT: number;
    user: { name: string; phone: string | null };
  };
  trainer: {
    id: string;
    user: { name: string };
  };
  attendance: { id: string; checkInTime: string } | null;
}

interface ScheduleViewProps {
  members: Member[];
  trainerId?: string;
  isAdmin: boolean;
}

const statusColors = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  NO_SHOW: "bg-red-100 text-red-800",
};

const statusLabels = {
  SCHEDULED: "예약됨",
  COMPLETED: "완료",
  CANCELLED: "취소됨",
  NO_SHOW: "노쇼",
};

export function ScheduleView({ members, trainerId, isAdmin }: ScheduleViewProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 새 예약 폼 상태
  const [newSchedule, setNewSchedule] = useState({
    memberProfileId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    notes: "",
  });

  useEffect(() => {
    fetchSchedules();
  }, [selectedDate]);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch(`/api/schedules?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch {
      toast.error("일정을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSchedule() {
    if (!newSchedule.memberProfileId) {
      toast.error("회원을 선택해주세요.");
      return;
    }

    setActionLoading("add");
    try {
      const scheduledAt = new Date(`${newSchedule.date}T${newSchedule.time}`);
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: newSchedule.memberProfileId,
          scheduledAt: scheduledAt.toISOString(),
          notes: newSchedule.notes,
        }),
      });

      if (res.ok) {
        toast.success("예약이 등록되었습니다.");
        setAddDialogOpen(false);
        setNewSchedule({
          memberProfileId: "",
          date: format(new Date(), "yyyy-MM-dd"),
          time: "10:00",
          notes: "",
        });
        fetchSchedules();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "예약 등록에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCheckIn(scheduleId: string) {
    setActionLoading(scheduleId);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (res.ok) {
        toast.success("출석이 완료되었습니다.");
        fetchSchedules();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "출석 처리에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(scheduleId: string) {
    setActionLoading(scheduleId);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (res.ok) {
        toast.success("예약이 취소되었습니다.");
        fetchSchedules();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "취소 처리에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleNoShow(scheduleId: string) {
    setActionLoading(scheduleId);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "NO_SHOW" }),
      });

      if (res.ok) {
        toast.success("노쇼 처리되었습니다.");
        fetchSchedules();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "노쇼 처리에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  // 주간 날짜 생성
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">일정 관리</h1>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "yyyy년 M월", { locale: ko })}
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              예약 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>PT 예약 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>회원 선택</Label>
                <Select
                  value={newSchedule.memberProfileId}
                  onValueChange={(value) =>
                    setNewSchedule({ ...newSchedule, memberProfileId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="회원을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.user.name} (잔여 PT: {member.remainingPT}회)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>날짜</Label>
                  <Input
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>시간</Label>
                  <Input
                    type="time"
                    value={newSchedule.time}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>메모</Label>
                <Textarea
                  placeholder="메모를 입력하세요"
                  value={newSchedule.notes}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <Button
                onClick={handleAddSchedule}
                disabled={actionLoading === "add"}
                className="w-full"
              >
                {actionLoading === "add" ? "등록 중..." : "예약 등록"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 주간 날짜 선택 */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(weekStart, "M월 d일", { locale: ko })} -{" "}
              {format(addDays(weekStart, 6), "M월 d일", { locale: ko })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isSelected =
                format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
              const isToday =
                format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`p-2 rounded-lg text-center transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                      ? "bg-accent"
                      : "hover:bg-accent"
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(day, "EEE", { locale: ko })}
                  </div>
                  <div className="text-sm font-medium">{format(day, "d")}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 일정 목록 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })}
        </h2>

        {loading ? (
          <Card>
            <CardContent className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              예약된 일정이 없습니다.
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {schedule.memberProfile.user.name}
                        </p>
                        <Badge className={statusColors[schedule.status]}>
                          {statusLabels[schedule.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(schedule.scheduledAt), "HH:mm")}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        잔여 PT: {schedule.memberProfile.remainingPT}회
                      </p>
                      {schedule.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {schedule.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {schedule.status === "SCHEDULED" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(schedule.id)}
                        disabled={actionLoading === schedule.id}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(schedule.id)}
                        disabled={actionLoading === schedule.id}
                      >
                        {actionLoading === schedule.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
