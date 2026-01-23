import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, QrCode, User, CreditCard } from "lucide-react";
import QRCode from "qrcode";
import Image from "next/image";

async function getMemberData(userId: string) {
  const member = await prisma.memberProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      qrCode: true,
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

async function generateQRCodeDataUrl(code: string): Promise<string> {
  try {
    return await QRCode.toDataURL(code, {
      width: 200,
      margin: 2,
    });
  } catch {
    return "";
  }
}

export default async function MyPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const member = await getMemberData(session.user.id);

  if (!member) {
    redirect("/dashboard");
  }

  const qrCodeDataUrl = member.qrCode
    ? await generateQRCodeDataUrl(member.qrCode)
    : "";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{member.user.name}님</h1>
        <p className="text-sm text-muted-foreground">마이페이지</p>
      </div>

      {/* QR Code Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            출석 QR 코드
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-4">
          {qrCodeDataUrl ? (
            <>
              <Image
                src={qrCodeDataUrl}
                alt="QR Code"
                width={180}
                height={180}
                className="rounded-lg"
              />
              <p className="mt-3 font-mono text-lg font-bold tracking-widest">
                {member.qrCode}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PT 출석 시 이 코드를 보여주세요
              </p>
            </>
          ) : (
            <div className="w-44 h-44 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">QR 코드 없음</p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Member Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">내 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">이름</span>
            <span className="text-sm">{member.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">이메일</span>
            <span className="text-sm">{member.user.email}</span>
          </div>
          {member.user.phone && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">전화번호</span>
              <span className="text-sm">{member.user.phone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">가입일</span>
            <span className="text-sm">
              {member.joinDate.toLocaleDateString("ko-KR")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
