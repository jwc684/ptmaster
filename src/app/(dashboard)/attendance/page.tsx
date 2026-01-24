"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Calendar, Clock, Loader2, CheckCircle, XCircle, User, Pencil, MessageSquare, Lock, Banknote, Trash2 } from "lucide-react";
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
  user: { name: string };
}

interface Attendance {
  id: string;
  checkInTime: string;
  remainingPTAfter: number | null;
  unitPrice: number | null;
  notes: string | null;
  internalNotes: string | null;
  memberProfile: {
    id: string;
    remainingPT: number;
    user: { name: string };
  };
  schedule?: {
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    scheduledAt: string;
    trainer: {
      user: { name: string };
    };
  } | null;
}

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터 상태
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

  // 메모 수정 다이얼로그 상태
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [editNotes, setEditNotes] = useState({ notes: "", internalNotes: "" });
  const [saving, setSaving] = useState(false);

  // 삭제 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attendanceToDelete, setAttendanceToDelete] = useState<Attendance | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 사용자 역할
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchUserRole();
  }, []);

  async function fetchUserRole() {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const data = await response.json();
        setUserRole(data?.user?.role || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  }

  useEffect(() => {
    fetchAttendance();
  }, [startDate, endDate, selectedMemberId]);

  async function fetchMembers() {
    try {
      const response = await fetch("/api/members?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  }

  async function fetchAttendance() {
    setLoading(true);
    try {
      let url = `/api/attendance?startDate=${startDate}&endDate=${endDate}`;
      if (selectedMemberId && selectedMemberId !== "all") {
        url += `&memberId=${selectedMemberId}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAttendances(data);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleThisMonth() {
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  }

  function handleToday() {
    const today = format(new Date(), "yyyy-MM-dd");
    setStartDate(today);
    setEndDate(today);
  }

  function handleResetFilter() {
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    setSelectedMemberId("all");
  }

  function openEditDialog(attendance: Attendance) {
    setSelectedAttendance(attendance);
    setEditNotes({
      notes: attendance.notes || "",
      internalNotes: attendance.internalNotes || "",
    });
    setEditDialogOpen(true);
  }

  async function handleSaveNotes() {
    if (!selectedAttendance) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/attendance/${selectedAttendance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: editNotes.notes,
          internalNotes: editNotes.internalNotes,
        }),
      });

      if (res.ok) {
        toast.success("메모가 수정되었습니다.");
        setEditDialogOpen(false);
        fetchAttendance();
      } else {
        const error = await res.json();
        toast.error(error.error || "메모 수정에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(attendance: Attendance) {
    setAttendanceToDelete(attendance);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!attendanceToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/attendance/${attendanceToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("출석 기록이 삭제되었습니다. (PT 1회 복원)");
        setDeleteDialogOpen(false);
        setAttendanceToDelete(null);
        fetchAttendance();
      } else {
        const error = await res.json();
        toast.error(error.error || "삭제에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  // 날짜별로 그룹화
  const groupedAttendances = attendances.reduce((groups, attendance) => {
    const date = format(new Date(attendance.checkInTime), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(attendance);
    return groups;
  }, {} as Record<string, Attendance[]>);

  const sortedDates = Object.keys(groupedAttendances).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="PT 출석"
        description="PT 출석 기록을 확인합니다."
      />

      {/* 필터 */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* 기간 선택 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>기간</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor="startDate" className="sr-only">시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 sm:flex-none sm:w-auto"
                />
                <span className="text-muted-foreground">~</span>
                <Label htmlFor="endDate" className="sr-only">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 sm:flex-none sm:w-auto"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleToday} className="flex-1 sm:flex-none">
                  오늘
                </Button>
                <Button variant="outline" size="sm" onClick={handleThisMonth} className="flex-1 sm:flex-none">
                  이번 달
                </Button>
              </div>
            </div>
          </div>

          {/* 회원 필터 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="flex-1 sm:w-[200px]">
                  <SelectValue placeholder="회원 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 회원</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMemberId !== "all" && (
              <Button variant="ghost" size="sm" onClick={handleResetFilter}>
                필터 초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 출석 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{attendances.length}건</p>
                <p className="text-xs text-muted-foreground">
                  출석 {attendances.filter(a => a.schedule?.status === "COMPLETED").length} /
                  취소 {attendances.filter(a => a.schedule?.status === "CANCELLED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Banknote className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  ₩{attendances.reduce((sum, a) => sum + (a.unitPrice || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">실제 매출</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 기간 정보 */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {startDate === endDate
                ? format(new Date(startDate), "M월 d일", { locale: ko })
                : `${format(new Date(startDate), "M/d", { locale: ko })} ~ ${format(new Date(endDate), "M/d", { locale: ko })}`
              }
            </span>
            {selectedMemberId !== "all" && members.find(m => m.id === selectedMemberId) && (
              <Badge variant="secondary">
                {members.find(m => m.id === selectedMemberId)?.user.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 출석 기록 목록 */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : attendances.length > 0 ? (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              출석 기록
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="divide-y divide-border/50">
              {sortedDates.map((date) => (
                <div key={date}>
                  {/* 날짜 헤더 */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[15px] font-medium">
                      {format(new Date(date), "M월 d일 (EEEE)", { locale: ko })}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {groupedAttendances[date].length}건
                    </Badge>
                  </div>

                  {/* 해당 날짜의 출석 기록 */}
                  <div className="divide-y divide-border/30">
                    {groupedAttendances[date].map((attendance) => {
                      const isCancelled = attendance.schedule?.status === "CANCELLED";
                      return (
                        <div
                          key={attendance.id}
                          className={`flex items-center gap-4 px-4 py-4 hover:bg-accent/30 transition-colors ${
                            isCancelled ? "opacity-60" : ""
                          }`}
                        >
                          {/* 상태 아이콘 */}
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCancelled ? "bg-destructive/10" : "bg-green-500/10"
                          }`}>
                            {isCancelled ? (
                              <XCircle className="h-6 w-6 text-destructive" />
                            ) : (
                              <CheckCircle className="h-6 w-6 text-green-500" />
                            )}
                          </div>

                          {/* 정보 */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[17px] font-semibold text-foreground truncate">
                                {attendance.memberProfile.user.name}
                              </p>
                              {isCancelled && (
                                <Badge variant="destructive" className="text-xs">취소</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[15px] text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(attendance.checkInTime), "HH:mm")}
                              {attendance.schedule?.trainer && (
                                <span className="hidden sm:inline">
                                  · 담당: {attendance.schedule.trainer.user.name}
                                </span>
                              )}
                            </div>
                            {/* 메모 */}
                            {(attendance.notes && !attendance.notes.startsWith("[취소]")) && (
                              <div className="flex items-center gap-1 mt-1">
                                <MessageSquare className="h-3 w-3 text-muted-foreground/70" />
                                <p className="text-[13px] text-muted-foreground/70 truncate">
                                  {attendance.notes}
                                </p>
                              </div>
                            )}
                            {attendance.internalNotes && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Lock className="h-3 w-3 text-orange-500" />
                                <p className="text-[13px] text-orange-600 dark:text-orange-400 truncate">
                                  {attendance.internalNotes}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* 오른쪽: 단가, 잔여PT, 액션 */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="hidden sm:flex flex-col items-end gap-1">
                              {attendance.unitPrice && (
                                <span className="text-[13px] text-muted-foreground">
                                  ₩{attendance.unitPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <Badge variant="outline">
                              {attendance.remainingPTAfter ?? attendance.memberProfile.remainingPT}회
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(attendance)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(attendance)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            출석 기록이 없습니다.
          </CardContent>
        </Card>
      )}

      {/* 메모 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>메모 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedAttendance && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedAttendance.memberProfile.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedAttendance.checkInTime), "M월 d일 HH:mm", { locale: ko })}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                공유 메모 (회원에게 보이는 메모)
              </Label>
              <Textarea
                placeholder="오늘 수업 내용, 다음 수업 안내 등"
                value={editNotes.notes}
                onChange={(e) => setEditNotes({ ...editNotes, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-orange-500" />
                내부 메모 (트레이너/관리자만 보이는 메모)
              </Label>
              <Textarea
                placeholder="컨디션, 특이사항 등 내부 기록용"
                value={editNotes.internalNotes}
                onChange={(e) => setEditNotes({ ...editNotes, internalNotes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={saving}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleSaveNotes}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>출석 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {attendanceToDelete && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-foreground">
                      {attendanceToDelete.memberProfile.user.name}
                    </p>
                    <p className="text-sm">
                      {format(new Date(attendanceToDelete.checkInTime), "M월 d일 HH:mm", { locale: ko })}
                    </p>
                  </div>
                )}
                <p>이 출석 기록을 삭제하시겠습니까?</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  삭제 시 PT 1회가 복원됩니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
