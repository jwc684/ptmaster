import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Phone, Mail, Calendar, CreditCard, User, Cake } from "lucide-react";
import { DeleteMemberButton } from "@/components/members/delete-member-button";
import { ImpersonateButton } from "@/components/members/impersonate-button";

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
        take: 10,
      },
    },
  });
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const member = await getMember(id);

  if (!member) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader
          title={member.user.name}
          description="회원 정보"
        />
        <div className="flex gap-2">
          {session.user.role === "SUPER_ADMIN" && (
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

      {/* PT 출석 기록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">PT 출석 기록</CardTitle>
        </CardHeader>
        <CardContent>
          {member.attendances.length > 0 ? (
            <div className="space-y-3">
              {member.attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">PT 출석</p>
                    {attendance.notes && (
                      <p className="text-sm text-muted-foreground">{attendance.notes}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {attendance.checkInTime.toLocaleDateString("ko-KR")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">출석 기록이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 결제 내역 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            결제 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          {member.payments.length > 0 ? (
            <div className="space-y-3">
              {member.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      ₩{payment.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PT {payment.ptCount}회
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={payment.status === "COMPLETED" ? "default" : "destructive"}>
                      {payment.status === "COMPLETED" ? "완료" : "환불"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {payment.paidAt.toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">결제 내역이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
