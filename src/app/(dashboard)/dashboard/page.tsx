import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCog, CreditCard, Activity, ClipboardCheck } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Admin Dashboard Stats
async function getAdminStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalMembers, totalTrainers, todayAttendance, monthlyRevenue, totalPTRemaining] =
    await Promise.all([
      prisma.memberProfile.count(),
      prisma.trainerProfile.count(),
      prisma.attendance.count({
        where: {
          checkInTime: { gte: today },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "COMPLETED",
          paidAt: { gte: monthStart },
        },
      }),
      prisma.memberProfile.aggregate({
        _sum: { remainingPT: true },
      }),
    ]);

  return {
    totalMembers,
    totalTrainers,
    todayAttendance,
    monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
    totalPTRemaining: totalPTRemaining._sum.remainingPT || 0,
  };
}

// Trainer Dashboard Stats
async function getTrainerStats(trainerId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [memberCount, todayAttendance, totalPTRemaining] = await Promise.all([
    prisma.memberProfile.count({
      where: { trainerId },
    }),
    prisma.attendance.count({
      where: {
        checkInTime: { gte: today },
        memberProfile: { is: { trainerId } },
      },
    }),
    prisma.memberProfile.aggregate({
      _sum: { remainingPT: true },
      where: { trainerId },
    }),
  ]);

  return {
    memberCount,
    todayAttendance,
    totalPTRemaining: totalPTRemaining._sum.remainingPT || 0,
  };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Admin Dashboard
async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">PT샵 현황</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="전체 회원"
          value={stats.totalMembers}
          icon={Users}
        />
        <StatCard
          title="트레이너"
          value={stats.totalTrainers}
          icon={UserCog}
        />
        <StatCard
          title="오늘 PT"
          value={stats.todayAttendance}
          icon={Activity}
        />
        <StatCard
          title="이번달 매출"
          value={`₩${stats.monthlyRevenue.toLocaleString()}`}
          icon={CreditCard}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">잔여 PT 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.totalPTRemaining}회</p>
          <p className="text-xs text-muted-foreground">전체 회원 잔여 PT</p>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">최근 가입 회원</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentMembers />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">오늘 PT 출석</CardTitle>
          </CardHeader>
          <CardContent>
            <TodayAttendances />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Trainer Dashboard
async function TrainerDashboard({ trainerId }: { trainerId: string }) {
  const stats = await getTrainerStats(trainerId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">내 PT 현황</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="담당 회원"
          value={stats.memberCount}
          icon={Users}
        />
        <StatCard
          title="오늘 PT"
          value={stats.todayAttendance}
          icon={Activity}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">잔여 PT</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.totalPTRemaining}회</p>
          <p className="text-xs text-muted-foreground">담당 회원 잔여 PT</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/attendance" className="flex-1">
          <Button className="w-full" size="lg">
            <ClipboardCheck className="mr-2 h-5 w-5" />
            PT 출석 체크
          </Button>
        </Link>
        <Link href="/my-members" className="flex-1">
          <Button variant="outline" className="w-full" size="lg">
            <Users className="mr-2 h-5 w-5" />
            내 회원
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">오늘 PT 출석</CardTitle>
        </CardHeader>
        <CardContent>
          <TrainerTodayAttendances trainerId={trainerId} />
        </CardContent>
      </Card>
    </div>
  );
}

async function RecentMembers() {
  const recentMembers = await prisma.memberProfile.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      remainingPT: true,
      joinDate: true,
      user: { select: { name: true } },
      trainer: { select: { user: { select: { name: true } } } },
    },
  });

  if (recentMembers.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">최근 가입한 회원이 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {recentMembers.map((member) => (
        <div key={member.id} className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium">{member.user.name}</p>
            <p className="text-xs text-muted-foreground">
              {member.trainer?.user.name || "미배정"}
            </p>
          </div>
          <Badge variant={member.remainingPT > 0 ? "default" : "secondary"}>
            PT {member.remainingPT}회
          </Badge>
        </div>
      ))}
    </div>
  );
}

async function TodayAttendances() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendances = await prisma.attendance.findMany({
    take: 5,
    where: {
      checkInTime: { gte: today },
    },
    orderBy: { checkInTime: "desc" },
    select: {
      id: true,
      checkInTime: true,
      notes: true,
      memberProfile: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (attendances.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">오늘 출석 기록이 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {attendances.map((attendance) => (
        <div key={attendance.id} className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium">{attendance.memberProfile.user.name}</p>
            {attendance.notes && (
              <p className="text-xs text-muted-foreground">{attendance.notes}</p>
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
  );
}

async function TrainerTodayAttendances({ trainerId }: { trainerId: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendances = await prisma.attendance.findMany({
    take: 5,
    where: {
      checkInTime: { gte: today },
      memberProfile: { is: { trainerId } },
    },
    orderBy: { checkInTime: "desc" },
    select: {
      id: true,
      checkInTime: true,
      notes: true,
      memberProfile: {
        select: {
          remainingPT: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  if (attendances.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">오늘 출석 기록이 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {attendances.map((attendance) => (
        <div key={attendance.id} className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium">{attendance.memberProfile.user.name}</p>
            {attendance.notes && (
              <p className="text-xs text-muted-foreground">{attendance.notes}</p>
            )}
          </div>
          <div className="text-right">
            <Badge variant="outline">잔여 {attendance.memberProfile.remainingPT}회</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {attendance.checkInTime.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Members should be redirected to their my page
  if (session.user.role === "MEMBER") {
    redirect("/my");
  }

  // Get trainer profile if trainer
  let trainerId: string | null = null;
  if (session.user.role === "TRAINER") {
    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    trainerId = trainerProfile?.id || null;
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {session.user.role === "ADMIN" ? (
        <AdminDashboard />
      ) : trainerId ? (
        <TrainerDashboard trainerId={trainerId} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          트레이너 프로필을 찾을 수 없습니다.
        </div>
      )}
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-12 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
