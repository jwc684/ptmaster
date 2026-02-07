import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, User } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { TrainerNotificationSettings } from "@/components/trainer/notification-settings";

async function getUserInfo(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });
}

async function getTrainerInfo(userId: string) {
  return prisma.trainerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      shop: { select: { name: true } },
      notifySchedule: true,
      notifyAttendance: true,
      notifyCancellation: true,
      notifyScheduleChange: true,
      notifyReminder: true,
    },
  });
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await getUserInfo(session.user.id);

  if (!user) {
    redirect("/login");
  }

  const isTrainer = session.user.role === "TRAINER";
  const trainerInfo = isTrainer ? await getTrainerInfo(session.user.id) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">설정</h1>
        <p className="text-sm text-muted-foreground">
          {isTrainer ? "내 정보 및 알림 설정" : "내 정보 및 계정 설정"}
        </p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            내 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isTrainer && trainerInfo ? (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">소속</span>
                <span className="text-sm">{trainerInfo.shop?.name ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">이름</span>
                <span className="text-sm">{user.name}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">이름</span>
                <span className="text-sm">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">이메일</span>
                <span className="text-sm">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">전화번호</span>
                  <span className="text-sm">{user.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">가입일</span>
                <span className="text-sm">
                  {user.createdAt.toLocaleDateString("ko-KR")}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Trainer Notification Settings */}
      {isTrainer && trainerInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              카톡 알림 메세지 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrainerNotificationSettings
              notifySchedule={trainerInfo.notifySchedule}
              notifyAttendance={trainerInfo.notifyAttendance}
              notifyCancellation={trainerInfo.notifyCancellation}
              notifyScheduleChange={trainerInfo.notifyScheduleChange}
              notifyReminder={trainerInfo.notifyReminder}
            />
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      <LogoutButton />
    </div>
  );
}
