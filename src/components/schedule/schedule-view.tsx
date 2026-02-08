"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Calendar,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useScheduleActions } from "@/hooks/use-schedule-actions";
import { ScheduleItemRow } from "./schedule-item";
import { ScheduleDialogs } from "./schedule-dialogs";
import type { ScheduleItemData } from "./schedule-types";

interface Member {
  id: string;
  remainingPT: number;
  user: { name: string; phone: string | null };
  trainer?: {
    id: string;
    user: { name: string };
  } | null;
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
  attendance: {
    id: string;
    checkInTime: string;
    notes: string | null;
    internalNotes: string | null;
  } | null;
}

interface ScheduleViewProps {
  members: Member[];
  trainerId?: string;
  isAdmin: boolean;
  tableView?: boolean;
}

function toScheduleItemData(s: Schedule): ScheduleItemData {
  return {
    id: s.id,
    scheduledAt: s.scheduledAt,
    status: s.status,
    notes: s.notes,
    memberName: s.memberProfile.user.name,
    memberProfileId: s.memberProfile.id,
    remainingPT: s.memberProfile.remainingPT,
    trainerName: s.trainer.user.name,
    attendance: s.attendance,
  };
}

function groupByDate(schedules: Schedule[]) {
  return schedules.reduce((groups, schedule) => {
    const date = format(new Date(schedule.scheduledAt), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(schedule);
    return groups;
  }, {} as Record<string, Schedule[]>);
}

function DateGroupedList({
  schedules,
  sortOrder,
  isAdmin,
  actions,
  router,
}: {
  schedules: Schedule[];
  sortOrder: "asc" | "desc";
  isAdmin: boolean;
  actions: ReturnType<typeof useScheduleActions>;
  router: ReturnType<typeof useRouter>;
}) {
  const grouped = groupByDate(schedules);
  const sortedDates = Object.keys(grouped).sort((a, b) =>
    sortOrder === "asc"
      ? new Date(a).getTime() - new Date(b).getTime()
      : new Date(b).getTime() - new Date(a).getTime()
  );

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          일정이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-[15px] font-medium">
                  {format(new Date(date), "M월 d일 (EEEE)", { locale: ko })}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {grouped[date].length}건
                </Badge>
              </div>
              <div className="divide-y divide-border/30">
                {grouped[date].map((schedule) => (
                  <ScheduleItemRow
                    key={schedule.id}
                    schedule={toScheduleItemData(schedule)}
                    showMemberName
                    showTrainerName={isAdmin}
                    showRemainingPT
                    actionLoading={actions.actionLoading}
                    onCheckIn={actions.openCheckInDialog}
                    onCancel={actions.openCancelDialog}
                    onRevert={actions.handleRevert}
                    onEdit={actions.openEditDialog}
                    onDelete={actions.openDeleteDialog}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "예정",
  COMPLETED: "완료",
  CANCELLED: "취소",
  NO_SHOW: "노쇼",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "outline",
};

export function ScheduleView({ members, trainerId, isAdmin, tableView }: ScheduleViewProps) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // 회원 필터
  const [memberFilter, setMemberFilter] = useState<string>("all");

  // 새 예약 폼 상태
  const [newSchedule, setNewSchedule] = useState({
    memberProfileId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    notes: "",
    isFree: false,
  });
  const [addLoading, setAddLoading] = useState(false);

  const selectedMember = members.find((m) => m.id === newSchedule.memberProfileId);

  const actions = useScheduleActions({
    onSuccess: () => {
      fetchSchedules();
      router.refresh();
    },
  });

  useEffect(() => {
    fetchSchedules();
  }, [memberFilter]);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (memberFilter && memberFilter !== "all") {
        params.append("memberId", memberFilter);
      }
      const url = params.toString() ? `/api/schedules?${params.toString()}` : "/api/schedules";

      const res = await fetch(url);
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

    setAddLoading(true);
    try {
      const scheduledAt = new Date(`${newSchedule.date}T${newSchedule.time}`);
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: newSchedule.memberProfileId,
          scheduledAt: scheduledAt.toISOString(),
          notes: newSchedule.notes,
          isFree: newSchedule.isFree || undefined,
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
          isFree: false,
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
      setAddLoading(false);
    }
  }

  // 탭 분류: 예정된 vs 지난
  const now = new Date();
  const { upcoming, past } = useMemo(() => {
    const upcoming: Schedule[] = [];
    const past: Schedule[] = [];
    for (const s of schedules) {
      if (s.status === "SCHEDULED" && new Date(s.scheduledAt) >= now) {
        upcoming.push(s);
      } else {
        past.push(s);
      }
    }
    // 예정된: 시간 오름차순
    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    // 지난: 시간 내림차순
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return { upcoming, past };
  }, [schedules]);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold truncate">
            {isAdmin ? "일정 관리" : "예약 관리"}
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            총 {schedules.length}건
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
                        {isAdmin && member.trainer && ` - ${member.trainer.user.name} 트레이너`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="flex items-center gap-2 rounded-none border p-3 bg-muted/50">
                <Checkbox
                  id="isFreeSchedule"
                  checked={newSchedule.isFree}
                  onCheckedChange={(checked) =>
                    setNewSchedule({ ...newSchedule, isFree: checked === true })
                  }
                />
                <Label htmlFor="isFreeSchedule" className="text-sm cursor-pointer">
                  무료 PT (잔여 PT 차감 없음)
                </Label>
              </div>

              {selectedMember && selectedMember.remainingPT <= 0 && !newSchedule.isFree && (
                <p className="text-sm text-destructive">
                  잔여 PT가 없습니다. 무료 PT를 체크하거나 PT를 등록해주세요.
                </p>
              )}

              <Button
                onClick={handleAddSchedule}
                disabled={addLoading || (selectedMember !== undefined && selectedMember.remainingPT <= 0 && !newSchedule.isFree)}
                className="w-full"
              >
                {addLoading ? "등록 중..." : "예약 등록"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 회원 필터 */}
      <Select value={memberFilter} onValueChange={setMemberFilter}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="전체 회원" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 회원</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.user.name}
              {isAdmin && member.trainer && ` (${member.trainer.user.name})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 일정 목록 */}
      {loading ? (
        <Card>
          <CardContent className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : tableView ? (
        /* 테이블 뷰 (Super Admin) - 탭 없이 전체 리스트 */
        <Card>
          <CardContent className="p-0">
            {schedules.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                일정이 없습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead className="hidden sm:table-cell">시간</TableHead>
                    <TableHead>회원</TableHead>
                    <TableHead className="hidden md:table-cell">트레이너</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="hidden lg:table-cell">잔여PT</TableHead>
                    <TableHead className="hidden lg:table-cell">메모</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...schedules]
                    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                    .map((schedule) => (
                    <TableRow
                      key={schedule.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/members/${schedule.memberProfile.id}`)}
                    >
                      <TableCell>
                        <div>
                          <span className="text-muted-foreground">
                            {format(new Date(schedule.scheduledAt), "M/d (EEE)", { locale: ko })}
                          </span>
                          <span className="sm:hidden text-xs text-muted-foreground ml-1">
                            {format(new Date(schedule.scheduledAt), "a h:mm", { locale: ko })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="font-medium">
                          {format(new Date(schedule.scheduledAt), "a h:mm", { locale: ko })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{schedule.memberProfile.user.name}</div>
                        <div className="md:hidden text-xs text-muted-foreground">
                          {schedule.trainer.user.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {schedule.trainer.user.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[schedule.status] || "outline"} className="text-xs">
                          {STATUS_LABELS[schedule.status] || schedule.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline">
                          {schedule.memberProfile.remainingPT}회
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                          {schedule.notes || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        /* 탭 뷰 (Admin/Trainer) */
        <Tabs defaultValue="upcoming">
          <TabsList className="w-full">
            <TabsTrigger value="upcoming" className="flex-1 gap-1.5">
              예정된 스케줄
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {upcoming.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 gap-1.5">
              지난 스케줄
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {past.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <DateGroupedList
              schedules={upcoming}
              sortOrder="asc"
              isAdmin={isAdmin}
              actions={actions}
              router={router}
            />
          </TabsContent>

          <TabsContent value="past">
            <DateGroupedList
              schedules={past}
              sortOrder="desc"
              isAdmin={isAdmin}
              actions={actions}
              router={router}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* 공유 다이얼로그 */}
      <ScheduleDialogs
        checkInDialogOpen={actions.checkInDialogOpen}
        setCheckInDialogOpen={actions.setCheckInDialogOpen}
        checkInNotes={actions.checkInNotes}
        setCheckInNotes={actions.setCheckInNotes}
        onCheckIn={actions.handleCheckIn}
        cancelDialogOpen={actions.cancelDialogOpen}
        setCancelDialogOpen={actions.setCancelDialogOpen}
        onCancel={actions.handleCancel}
        editDialogOpen={actions.editDialogOpen}
        setEditDialogOpen={actions.setEditDialogOpen}
        editForm={actions.editForm}
        setEditForm={actions.setEditForm}
        onEdit={actions.handleEditSchedule}
        deleteDialogOpen={actions.deleteDialogOpen}
        setDeleteDialogOpen={actions.setDeleteDialogOpen}
        onDelete={actions.handleDeleteSchedule}
        selectedSchedule={actions.selectedSchedule}
        actionLoading={actions.actionLoading}
      />
    </div>
  );
}
