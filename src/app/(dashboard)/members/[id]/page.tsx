import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/role-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Phone, Mail, Calendar, User, Cake, Building2, History } from "lucide-react";
import { DeleteMemberButton } from "@/components/members/delete-member-button";
import { ImpersonateButton } from "@/components/members/impersonate-button";
import { MemberScheduleTabs } from "@/components/members/member-schedule-tabs";
import { MemberWorkoutHistory } from "@/components/members/member-workout-history";

async function getMember(id: string) {
  return prisma.memberProfile.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      remainingPT: true,
      notes: true,
      birthDate: true,
      gender: true,
      joinDate: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      trainer: {
        select: {
          user: { select: { name: true } },
        },
      },
      shop: {
        select: { name: true },
      },
      attendances: {
        select: {
          id: true,
          checkInTime: true,
          notes: true,
        },
        orderBy: { checkInTime: "desc" },
        take: 10,
      },
      payments: {
        select: {
          id: true,
          amount: true,
          ptCount: true,
          status: true,
          paidAt: true,
        },
        orderBy: { paidAt: "desc" },
      },
      schedules: {
        select: {
          id: true,
          status: true,
          notes: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          trainer: { select: { user: { select: { name: true } } } },
          attendance: {
            select: {
              id: true,
              checkInTime: true,
              notes: true,
              internalNotes: true,
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });
}

interface PTHistoryEntry {
  date: Date;
  change: number;
  label: string;
  detail: string;
}

function buildPTHistory(member: NonNullable<Awaited<ReturnType<typeof getMember>>>): PTHistoryEntry[] {
  const entries: PTHistoryEntry[] = [];

  // From Payments (COMPLETED → +ptCount)
  for (const p of member.payments) {
    if (p.status === "COMPLETED") {
      entries.push({
        date: p.paidAt,
        change: p.ptCount,
        label: "결제",
        detail: `₩${p.amount.toLocaleString()} / ${p.ptCount}회`,
      });
    }
  }

  // From Schedules
  for (const s of member.schedules) {
    const isFree = s.notes?.includes("[무료]") ?? false;

    if (isFree) {
      // 무료 PT: PT 변동 없음, 참고용으로 표시
      entries.push({
        date: s.createdAt,
        change: 0,
        label: "무료 예약",
        detail: `${s.trainer.user.name} / ${s.scheduledAt.toLocaleDateString("ko-KR")}`,
      });
      continue;
    }

    // 유료 예약: 생성 시 -1
    entries.push({
      date: s.createdAt,
      change: -1,
      label: "예약",
      detail: `${s.trainer.user.name} / ${s.scheduledAt.toLocaleDateString("ko-KR")}`,
    });

    // 취소 복구: notes가 "[취소]"로 시작하되 "[취소-차감]"이 아닌 경우 → +1
    if (s.status === "CANCELLED" && s.notes?.startsWith("[취소]") && !s.notes?.startsWith("[취소-차감]")) {
      entries.push({
        date: s.updatedAt,
        change: 1,
        label: "취소 복구",
        detail: `${s.trainer.user.name} / ${s.scheduledAt.toLocaleDateString("ko-KR")}`,
      });
    }
  }

  // Sort by date descending
  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  return entries;
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.roles, "ADMIN", "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const member = await getMember(id);

  if (!member) {
    notFound();
  }

  const ptHistory = buildPTHistory(member);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader
          title={member.user.name}
          description="회원 정보"
        />
        <div className="flex gap-2">
          {session.user.roles.includes("SUPER_ADMIN") && (
            <ImpersonateButton
              userId={member.userId}
              userName={member.user.name}
              userEmail={member.user.email}
            />
          )}
          <Button asChild size="sm">
            <Link href={`/members/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              수정
            </Link>
          </Button>
          <DeleteMemberButton memberId={id} memberName={member.user.name} />
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-sm">전화번호</span>
            </div>
            <span>{member.user.phone || "-"}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="text-sm">이메일</span>
            </div>
            <span className="text-sm">{member.user.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cake className="h-4 w-4" />
              <span className="text-sm">생년월일</span>
            </div>
            <span>{member.birthDate ? member.birthDate.toLocaleDateString("ko-KR") : "-"}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm">성별</span>
            </div>
            <span>{member.gender === "MALE" ? "남성" : member.gender === "FEMALE" ? "여성" : "-"}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">가입일</span>
            </div>
            <span>{member.joinDate.toLocaleDateString("ko-KR")}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">소속 매장</span>
            </div>
            <span>{member.shop?.name || "-"}</span>
          </div>
        </CardContent>
      </Card>

      {/* PT 정보 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">PT 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">잔여 PT 횟수</span>
            <Badge variant={member.remainingPT > 0 ? "default" : "secondary"} className="text-lg px-3 py-1">
              {member.remainingPT}회
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">담당 트레이너</span>
            <span>{member.trainer?.user.name || "미배정"}</span>
          </div>
          {member.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-1">메모</p>
              <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 스케줄 내역 */}
      <MemberScheduleTabs
        schedules={member.schedules.map((s) => ({
          id: s.id,
          scheduledAt: s.scheduledAt.toISOString(),
          status: s.status,
          notes: s.notes,
          trainerName: s.trainer.user.name,
          attendance: s.attendance ? {
            id: s.attendance.id,
            checkInTime: s.attendance.checkInTime?.toISOString() || "",
            notes: s.attendance.notes ?? null,
            internalNotes: s.attendance.internalNotes ?? null,
          } : null,
        }))}
        memberName={member.user.name}
        memberProfileId={member.id}
        remainingPT={member.remainingPT}
      />

      {/* 운동 기록 */}
      <MemberWorkoutHistory memberProfileId={member.id} planHref={`/members/${member.id}/workout-plan`} />

      {/* PT 변동 내역 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            PT 변동 내역
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ptHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>변동</TableHead>
                  <TableHead className="hidden sm:table-cell">상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ptHistory.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">
                      {entry.date.toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.change > 0
                            ? "default"
                            : entry.change < 0
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {entry.label}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`font-medium ${
                        entry.change > 0
                          ? "text-green-600"
                          : entry.change < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {entry.change > 0 ? `+${entry.change}` : entry.change === 0 ? "0" : entry.change}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {entry.detail}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">PT 변동 내역이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
