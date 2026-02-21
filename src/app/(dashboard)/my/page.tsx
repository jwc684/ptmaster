import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, User, CreditCard, Building2 } from "lucide-react";

async function getMemberData(userId: string) {
  const member = await prisma.memberProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      remainingPT: true,
      notes: true,
      joinDate: true,
      user: { select: { name: true, email: true, phone: true } },
      trainer: {
        select: {
          user: { select: { name: true, phone: true } },
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
          paidAt: true,
        },
        orderBy: { paidAt: "desc" },
        take: 5,
      },
    },
  });

  return member;
}

export default async function MyPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const member = await getMemberData(session.user.id);

  if (!member) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">{session.user.name || "회원"}님, 환영합니다!</h1>
          <p className="text-sm text-muted-foreground">마이페이지</p>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              센터 등록
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              PT 센터를 선택하면 일정 관리, 출석 확인 등 다양한 서비스를 이용할 수 있습니다.
            </p>
            <Button asChild className="w-full">
              <Link href="/my/select-shop">센터 선택하기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{member.user.name}님</h1>
        <p className="text-sm text-muted-foreground">마이페이지</p>
      </div>

      {/* PT Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            PT 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">잔여 PT 횟수</p>
              <p className="text-3xl font-bold">{member.remainingPT}회</p>
            </div>
            <Badge
              variant={member.remainingPT > 0 ? "default" : "secondary"}
              className="text-lg px-4 py-2"
            >
              {member.remainingPT > 0 ? "이용 가능" : "충전 필요"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Trainer Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            담당 트레이너
          </CardTitle>
        </CardHeader>
        <CardContent>
          {member.trainer ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{member.trainer.user.name}</p>
                {member.trainer.user.phone && (
                  <p className="text-sm text-muted-foreground">
                    {member.trainer.user.phone}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              아직 담당 트레이너가 배정되지 않았습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent PT History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">최근 PT 기록</CardTitle>
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
                    <p className="text-sm font-medium">
                      {attendance.checkInTime.toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </p>
                    {attendance.notes && (
                      <p className="text-xs text-muted-foreground">
                        {attendance.notes}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {attendance.checkInTime.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              PT 기록이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            최근 결제 내역
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
                    <p className="text-sm font-medium">
                      PT {payment.ptCount}회
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.paidAt.toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <p className="font-medium">
                    {payment.amount.toLocaleString()}원
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              결제 내역이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
