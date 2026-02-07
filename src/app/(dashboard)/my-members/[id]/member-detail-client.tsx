"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Plus,
  Loader2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Schedule {
  id: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
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

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
> = {
  SCHEDULED: { label: "예정", variant: "default", icon: Clock },
  COMPLETED: { label: "완료", variant: "secondary", icon: CheckCircle2 },
  CANCELLED: { label: "취소", variant: "destructive", icon: XCircle },
  NO_SHOW: { label: "노쇼", variant: "outline", icon: AlertCircle },
};

export function MemberDetailClient({ member, trainerProfileId }: Props) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const now = new Date().toISOString();
  const upcoming = member.schedules.filter(
    (s) => s.status === "SCHEDULED" && s.scheduledAt >= now
  );
  const completed = member.schedules.filter(
    (s) => s.status !== "SCHEDULED" || s.scheduledAt < now
  );

  async function handleAddSchedule() {
    if (!scheduledAt) {
      toast.error("예약 일시를 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberProfileId: member.id,
          scheduledAt: new Date(scheduledAt).toISOString(),
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "예약 등록에 실패했습니다.");
        return;
      }

      toast.success(data.message || "예약이 등록되었습니다.");
      setAddDialogOpen(false);
      setScheduledAt("");
      setNotes("");
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

      {/* Upcoming Schedules */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            예약 리스트
            {upcoming.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {upcoming.length}건
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map((schedule) => {
                const config = STATUS_CONFIG[schedule.status];
                const Icon = config?.icon || Clock;
                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(schedule.scheduledAt).toLocaleDateString(
                            "ko-KR",
                            { month: "long", day: "numeric", weekday: "short" }
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(schedule.scheduledAt).toLocaleTimeString(
                            "ko-KR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge variant={config?.variant || "default"}>
                      {config?.label || schedule.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              예정된 예약이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completed / Past Schedules */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            PT 완료 내역
            {completed.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {completed.length}건
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completed.length > 0 ? (
            <div className="space-y-3">
              {completed.map((schedule) => {
                const config = STATUS_CONFIG[schedule.status];
                const Icon = config?.icon || CheckCircle2;
                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(schedule.scheduledAt).toLocaleDateString(
                            "ko-KR",
                            { month: "long", day: "numeric", weekday: "short" }
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(schedule.scheduledAt).toLocaleTimeString(
                            "ko-KR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                          {schedule.notes && ` · ${schedule.notes}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={config?.variant || "secondary"}>
                      {config?.label || schedule.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              완료된 PT가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Schedule Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PT 예약 추가</DialogTitle>
            <DialogDescription>
              {member.user.name}님의 PT 예약을 등록합니다.
              {member.remainingPT <= 0 && (
                <span className="block text-destructive mt-1">
                  잔여 PT가 없습니다. PT 등록 후 예약해주세요.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">예약 일시</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
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

            <Button
              onClick={handleAddSchedule}
              disabled={submitting || !scheduledAt || member.remainingPT <= 0}
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
