import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, User } from "lucide-react";
import { NotificationSettings } from "@/components/members/notification-settings";

async function getMemberSettings(userId: string) {
  const member = await prisma.memberProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      kakaoNotification: true,
      joinDate: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  return member;
}

export default async function MySettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const member = await getMemberSettings(session.user.id);

  if (!member) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">설정</h1>
        <p className="text-sm text-muted-foreground">내 정보 및 알림 설정</p>
      </div>

      {/* Member Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            내 정보
          </CardTitle>
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

      {/* Notification Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettings
            memberId={member.id}
            kakaoNotification={member.kakaoNotification}
          />
        </CardContent>
      </Card>
    </div>
  );
}
