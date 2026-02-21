"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Activity,
  CreditCard,
  Plus,
  Loader2,
  Dumbbell,
} from "lucide-react";
import { MemberWorkoutHistory } from "@/components/members/member-workout-history";
import { useScheduleActions } from "@/hooks/use-schedule-actions";
import { ScheduleItemRow } from "@/components/schedule/schedule-item";
import { ScheduleDialogs } from "@/components/schedule/schedule-dialogs";
import type { ScheduleItemData } from "@/components/schedule/schedule-types";

interface Schedule {
  id: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
  attendance: {
    id?: string;
    checkInTime?: string;
    notes: string | null;
    internalNotes: string | null;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  ptCount: number;
  paidAt: string;
  description: string | null;
}

interface MemberData {
  id: string;
  remainingPT: number;
  joinDate: string;
  notes: string | null;
  user: { name: string; phone: string | null; email: string };
  payments: Payment[];
  schedules: Schedule[];
}

interface Props {
  member: MemberData;
  trainerProfileId: string;
}

function toScheduleItemData(s: Schedule, memberName: string, memberProfileId: string, remainingPT: number): ScheduleItemData {
  return {
    id: s.id,
    scheduledAt: s.scheduledAt,
    status: s.status as ScheduleItemData["status"],
    notes: s.notes,
    memberName,
    memberProfileId,
    remainingPT,
    attendance: s.attendance ? {
      id: s.attendance.id || "",
      checkInTime: s.attendance.checkInTime || "",
      notes: s.attendance.notes,
      internalNotes: s.attendance.internalNotes,
    } : null,
  };
}

export function MemberDetailClient({ member, trainerProfileId }: Props) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const actions = useScheduleActions({
    onSuccess: () => router.refresh(),
  });

  const now = new Date().toISOString();
  const upcoming = member.schedules.filter(
    (s) => s.status === "SCHEDULED" && s.scheduledAt >= now
  );
  const completed = member.schedules.filter(
    (s) => s.status !== "SCHEDULED" || s.scheduledAt < now
  );

  async function handleAddSchedule() {
    if (!scheduleDate || !scheduleTime) {
      toast.error("날짜와 시간을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: member.id,
          scheduledAt: scheduledAt.toISOString(),
          notes: notes || undefined,
          isFree: isFree || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "예약 등록에 실패했습니다.");
        return;
      }

      toast.success(data.message || "예약이 등록되었습니다.");
      setAddDialogOpen(false);
      setScheduleDate(format(new Date(), "yyyy-MM-dd"));
      setScheduleTime("10:00");
      setNotes("");
      setIsFree(false);
      router.refresh();
    } catch {
      toast.error("예약 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link
          href="/my-members"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          내 회원
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{member.user.name}</h1>
            {member.user.phone && (
              <p className="text-sm text-muted-foreground">{member.user.phone}</p>
            )}
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            예약 추가
          </Button>
        </div>
      </div>

      {/* PT Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            회원권
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">잔여 PT</p>
              <p className="text-3xl font-bold">{member.remainingPT}회</p>
            </div>
            <Badge
              variant={member.remainingPT > 0 ? "default" : "secondary"}
              className="text-base px-3 py-1"
            >
              {member.remainingPT > 0 ? "이용 가능" : "충전 필요"}
            </Badge>
          </div>
          {member.payments.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">최근 결제</p>
              {member.payments.slice(0, 3).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3 w-3 text-muted-foreground" />
                    <span>PT {payment.ptCount}회</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">
                      {payment.amount.toLocaleString()}원
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(payment.paidAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedules & Workout Tabs */}
      <Tabs defaultValue="upcoming" className="gap-0">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming">
            예정
            {upcoming.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            지난 스케줄
            {completed.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {completed.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="workouts">
            <Dumbbell className="h-3.5 w-3.5 mr-1" />
            운동 기록
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {upcoming.length > 0 ? (
            <div className="divide-y divide-border/30">
              {upcoming.map((schedule) => (
                <ScheduleItemRow
                  key={schedule.id}
                  schedule={toScheduleItemData(schedule, member.user.name, member.id, member.remainingPT)}
                  showMemberName={false}
                  showTrainerName={false}
                  showRemainingPT={false}
                  actionLoading={actions.actionLoading}
                  onCheckIn={actions.openCheckInDialog}
                  onCancel={actions.openCancelDialog}
                  onRevert={actions.handleRevert}
                  onEdit={actions.openEditDialog}
                  onDelete={actions.openDeleteDialog}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              예정된 스케줄이 없습니다.
            </p>
          )}
        </TabsContent>
        <TabsContent value="past">
          {completed.length > 0 ? (
            <div className="divide-y divide-border/30">
              {completed.map((schedule) => (
                <ScheduleItemRow
                  key={schedule.id}
                  schedule={toScheduleItemData(schedule, member.user.name, member.id, member.remainingPT)}
                  showMemberName={false}
                  showTrainerName={false}
                  showRemainingPT={false}
                  actionLoading={actions.actionLoading}
                  onCheckIn={actions.openCheckInDialog}
                  onCancel={actions.openCancelDialog}
                  onRevert={actions.handleRevert}
                  onEdit={actions.openEditDialog}
                  onDelete={actions.openDeleteDialog}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              지난 스케줄이 없습니다.
            </p>
          )}
        </TabsContent>
        <TabsContent value="workouts">
          <MemberWorkoutHistory memberProfileId={member.id} planHref={`/my-members/${member.id}/workout-plan`} />
        </TabsContent>
      </Tabs>

      {/* Shared schedule action dialogs */}
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

      {/* Add Schedule Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>PT 예약 추가</DialogTitle>
            <DialogDescription>
              {member.user.name}님의 PT 예약을 등록합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>시간</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">메모 (선택)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="예약 관련 메모"
              />
            </div>

            <div className="flex items-center gap-2 rounded-none border p-3 bg-muted/50">
              <Checkbox
                id="isFree"
                checked={isFree}
                onCheckedChange={(checked) => setIsFree(checked === true)}
              />
              <Label htmlFor="isFree" className="text-sm cursor-pointer">
                무료 PT (잔여 PT 차감 없음)
              </Label>
            </div>

            {member.remainingPT <= 0 && !isFree && (
              <p className="text-sm text-destructive">
                잔여 PT가 없습니다. 무료 PT를 체크하거나 PT를 등록해주세요.
              </p>
            )}

            <Button
              onClick={handleAddSchedule}
              disabled={submitting || !scheduleDate || !scheduleTime || (member.remainingPT <= 0 && !isFree)}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              예약 등록
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
