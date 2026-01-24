"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Calendar,
  Plus,
  Check,
  X,
  Clock,
  User,
  Loader2,
  Filter,
  RotateCcw,
  Pencil,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Lock,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 출석 메모 폼 상태
  const [checkInNotes, setCheckInNotes] = useState({
    notes: "",           // 공유 메모 (회원에게 보이는 메모)
    internalNotes: "",   // 내부 메모 (트레이너/관리자만)
  });

  // 수정 폼 상태
  const [editForm, setEditForm] = useState({
    date: "",
    time: "",
    notes: "",
  });

  // 필터 상태
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 새 예약 폼 상태
  const [newSchedule, setNewSchedule] = useState({
    memberProfileId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    notes: "",
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  async function fetchSchedules() {
    setLoading(true);
    try {
      let url = "/api/schedules";
      const params = new URLSearchParams();

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

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

  function handleApplyFilter() {
    fetchSchedules();
    setFilterDialogOpen(false);
  }

  function handleResetFilter() {
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
    setTimeout(() => fetchSchedules(), 0);
    setFilterDialogOpen(false);
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

  function openCheckInDialog(schedule: Schedule) {
    setSelectedSchedule(schedule);
    setCheckInNotes({ notes: "", internalNotes: "" });
    setCheckInDialogOpen(true);
  }

  async function handleCheckIn() {
    if (!selectedSchedule) return;

    setActionLoading("checkIn");
    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          notes: checkInNotes.notes || undefined,
          internalNotes: checkInNotes.internalNotes || undefined,
        }),
      });

      if (res.ok) {
        toast.success("출석이 완료되었습니다.");
        setCheckInDialogOpen(false);
        setSelectedSchedule(null);
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

  function openCancelDialog(schedule: Schedule) {
    setSelectedSchedule(schedule);
    setCancelDialogOpen(true);
  }

  async function handleCancel(deductPT: boolean) {
    if (!selectedSchedule) return;

    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", deductPT }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "예약이 취소되었습니다.");
        setCancelDialogOpen(false);
        setSelectedSchedule(null);
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

  async function handleRevert(scheduleId: string) {
    setActionLoading(scheduleId);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED" }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "되돌려졌습니다.");
        fetchSchedules();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "되돌리기에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  function openEditDialog(schedule: Schedule) {
    setSelectedSchedule(schedule);
    const scheduledDate = new Date(schedule.scheduledAt);
    setEditForm({
      date: format(scheduledDate, "yyyy-MM-dd"),
      time: format(scheduledDate, "HH:mm"),
      notes: schedule.notes || "",
    });
    setEditDialogOpen(true);
  }

  async function handleEditSchedule() {
    if (!selectedSchedule) return;

    setActionLoading("edit");
    try {
      const scheduledAt = new Date(`${editForm.date}T${editForm.time}`);
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
          notes: editForm.notes,
        }),
      });

      if (res.ok) {
        toast.success("일정이 수정되었습니다.");
        setEditDialogOpen(false);
        setSelectedSchedule(null);
        fetchSchedules();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "일정 수정에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  function openDeleteDialog(schedule: Schedule) {
    setSelectedSchedule(schedule);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteSchedule() {
    if (!selectedSchedule) return;

    setActionLoading("delete");
    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("일정이 삭제되었습니다.");
        setDeleteDialogOpen(false);
        setSelectedSchedule(null);
        fetchSchedules();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "일정 삭제에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  // 날짜별로 그룹화
  const groupedSchedules = schedules.reduce((groups, schedule) => {
    const date = format(new Date(schedule.scheduledAt), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(schedule);
    return groups;
  }, {} as Record<string, Schedule[]>);

  const sortedDates = Object.keys(groupedSchedules).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">일정 관리</h1>
          <p className="text-sm text-muted-foreground">
            총 {schedules.length}건의 일정
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                필터
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>일정 필터</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>시작일</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>종료일</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>상태</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="SCHEDULED">예약됨</SelectItem>
                      <SelectItem value="COMPLETED">완료</SelectItem>
                      <SelectItem value="CANCELLED">취소됨</SelectItem>
                      <SelectItem value="NO_SHOW">노쇼</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleResetFilter} className="flex-1">
                    초기화
                  </Button>
                  <Button onClick={handleApplyFilter} className="flex-1">
                    적용
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
      </div>

      {/* 적용된 필터 표시 */}
      {(startDate || endDate || statusFilter !== "all") && (
        <div className="flex flex-wrap gap-2">
          {startDate && (
            <Badge variant="secondary">
              시작: {format(new Date(startDate), "M월 d일", { locale: ko })}
            </Badge>
          )}
          {endDate && (
            <Badge variant="secondary">
              종료: {format(new Date(endDate), "M월 d일", { locale: ko })}
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary">
              {statusLabels[statusFilter as keyof typeof statusLabels]}
            </Badge>
          )}
        </div>
      )}

      {/* 일정 목록 */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              일정이 없습니다.
            </CardContent>
          </Card>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(date), "M월 d일 (EEEE)", { locale: ko })}
                <Badge variant="outline" className="ml-auto">
                  {groupedSchedules[date].length}건
                </Badge>
              </h2>
              <div className="space-y-2">
                {groupedSchedules[date].map((schedule) => (
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
                            {/* 출석 메모 (완료/취소된 일정) */}
                            {schedule.attendance?.notes && (
                              <div className="flex items-start gap-1 mt-1">
                                <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                  {schedule.attendance.notes}
                                </p>
                              </div>
                            )}
                            {schedule.attendance?.internalNotes && (
                              <div className="flex items-start gap-1 mt-1">
                                <Lock className="h-3 w-3 text-orange-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-orange-600 dark:text-orange-400">
                                  {schedule.attendance.internalNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {schedule.status === "SCHEDULED" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCancelDialog(schedule)}
                              disabled={!!actionLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openCheckInDialog(schedule)}
                              disabled={!!actionLoading}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {schedule.status === "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevert(schedule.id)}
                            disabled={actionLoading === schedule.id}
                            title="출석 되돌리기"
                          >
                            {actionLoading === schedule.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {schedule.status === "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevert(schedule.id)}
                            disabled={actionLoading === schedule.id}
                            title="취소 되돌리기"
                          >
                            {actionLoading === schedule.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* 더보기 메뉴 (수정/삭제) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(schedule)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(schedule)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일정 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedSchedule.memberProfile.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {statusLabels[selectedSchedule.status]}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>시간</Label>
                <Input
                  type="time"
                  value={editForm.time}
                  onChange={(e) =>
                    setEditForm({ ...editForm, time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                placeholder="메모를 입력하세요"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <Button
              onClick={handleEditSchedule}
              disabled={actionLoading === "edit"}
              className="w-full"
            >
              {actionLoading === "edit" ? "수정 중..." : "수정하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSchedule && (
                <>
                  {selectedSchedule.memberProfile.user.name}님의{" "}
                  {format(new Date(selectedSchedule.scheduledAt), "M월 d일 HH:mm", { locale: ko })}{" "}
                  예약을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSchedule}
              disabled={actionLoading === "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === "delete" ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 출석 체크 다이얼로그 */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PT 출석 체크</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedSchedule.memberProfile.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedSchedule.scheduledAt), "M월 d일 HH:mm", { locale: ko })}
                </p>
                <p className="text-sm text-muted-foreground">
                  잔여 PT: {selectedSchedule.memberProfile.remainingPT}회 → {selectedSchedule.memberProfile.remainingPT - 1}회
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>공유 메모 (회원에게 보이는 메모)</Label>
              <Textarea
                placeholder="오늘 수업 내용, 다음 수업 안내 등"
                value={checkInNotes.notes}
                onChange={(e) =>
                  setCheckInNotes({ ...checkInNotes, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>내부 메모 (트레이너/관리자만 보이는 메모)</Label>
              <Textarea
                placeholder="컨디션, 특이사항 등 내부 기록용"
                value={checkInNotes.internalNotes}
                onChange={(e) =>
                  setCheckInNotes({ ...checkInNotes, internalNotes: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCheckInDialogOpen(false)}
                disabled={actionLoading === "checkIn"}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleCheckIn}
                disabled={actionLoading === "checkIn"}
                className="flex-1"
              >
                {actionLoading === "checkIn" ? "처리 중..." : "출석 완료"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 예약 취소 다이얼로그 */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 취소</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedSchedule.memberProfile.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedSchedule.scheduledAt), "M월 d일 HH:mm", { locale: ko })}
                </p>
                <p className="text-sm text-muted-foreground">
                  현재 잔여 PT: {selectedSchedule.memberProfile.remainingPT}회
                </p>
              </div>
            )}

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">PT 차감 여부를 선택해주세요</p>
              <p className="text-xs text-yellow-700 mt-1">
                노쇼 등의 사유로 취소하는 경우 PT를 차감할 수 있습니다.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={actionLoading === "cancel"}
                className="flex-1"
              >
                돌아가기
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleCancel(false)}
                disabled={actionLoading === "cancel"}
                className="flex-1"
              >
                {actionLoading === "cancel" ? "처리 중..." : "미차감 취소"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleCancel(true)}
                disabled={actionLoading === "cancel"}
                className="flex-1"
              >
                {actionLoading === "cancel" ? "처리 중..." : "차감 취소"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
