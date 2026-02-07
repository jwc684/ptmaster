import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getAuthWithShop, buildShopFilter } from "@/lib/shop-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCog, CreditCard, Activity, ClipboardCheck } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PTTrendsChart } from "@/components/dashboard/pt-trends-chart";
import { MemberTrendsChart } from "@/components/dashboard/member-trends-chart";
import { PaymentTrendsChart } from "@/components/dashboard/payment-trends-chart";

// Admin Dashboard Stats
async function getAdminStats(shopFilter: { shopId?: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalMembers, totalTrainers, todayAttendance, monthlyRevenue, totalPTRemaining] =
    await Promise.all([
      prisma.memberProfile.count({ where: shopFilter }),
      prisma.trainerProfile.count({ where: shopFilter }),
      prisma.attendance.count({
        where: {
          checkInTime: { gte: today },
          ...shopFilter,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "COMPLETED",
          paidAt: { gte: monthStart },
          ...shopFilter,
        },
      }),
      prisma.memberProfile.aggregate({
        _sum: { remainingPT: true },
        where: shopFilter,
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

// Compact Stat Item for horizontal display - Toss style
function CompactStat({
  label,
  value,
  icon: Icon,
  color = "primary",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: "primary" | "success" | "warning" | "info";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    info: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`p-2.5 rounded-xl shrink-0 ${colorClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold truncate">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

// Admin Dashboard
async function AdminDashboard({ shopFilter }: { shopFilter: { shopId?: string } }) {
  const stats = await getAdminStats(shopFilter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">PT샵 현황</p>
      </div>

      {/* Stats Bar - responsive grid - Toss style */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
            <CompactStat label="전체 회원" value={`${stats.totalMembers}명`} icon={Users} color="primary" />
            <CompactStat label="트레이너" value={`${stats.totalTrainers}명`} icon={UserCog} color="info" />
            <CompactStat label="오늘 PT" value={`${stats.todayAttendance}회`} icon={Activity} color="success" />
            <CompactStat label="이번달 매출" value={`₩${(stats.monthlyRevenue / 10000).toFixed(0)}만`} icon={CreditCard} color="warning" />
            <CompactStat label="잔여 PT" value={`${stats.totalPTRemaining}회`} icon={ClipboardCheck} color="primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">PT 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <PTTrendsChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">신규 회원 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberTrendsChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">PT 등록 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentTrendsChart />
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">최근 가입 회원</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentMembers shopFilter={shopFilter} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">오늘 PT 출석</CardTitle>
          </CardHeader>
          <CardContent>
            <TodayAttendances shopFilter={shopFilter} />
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

      {/* Stats Bar - responsive - Toss style */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4">
            <CompactStat label="담당 회원" value={`${stats.memberCount}명`} icon={Users} color="primary" />
            <CompactStat label="오늘 PT" value={`${stats.todayAttendance}회`} icon={Activity} color="success" />
            <CompactStat label="잔여 PT" value={`${stats.totalPTRemaining}회`} icon={ClipboardCheck} color="info" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">PT 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <PTTrendsChart trainerId={trainerId} />
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

async function RecentMembers({ shopFilter }: { shopFilter: { shopId?: string } }) {
  const recentMembers = await prisma.memberProfile.findMany({
    where: shopFilter,
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

async function TodayAttendances({ shopFilter }: { shopFilter: { shopId?: string } }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendances = await prisma.attendance.findMany({
    take: 5,
    where: {
      checkInTime: { gte: today },
      memberProfileId: { not: null },
      ...shopFilter,
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
            <p className="text-sm font-medium">{attendance.memberProfile?.user.name ?? "삭제된 회원"}</p>
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
      memberProfileId: { not: null },
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
            <p className="text-sm font-medium">{attendance.memberProfile?.user.name ?? "삭제된 회원"}</p>
            {attendance.notes && (
              <p className="text-xs text-muted-foreground">{attendance.notes}</p>
            )}
          </div>
          <div className="text-right">
            <Badge variant="outline">잔여 {attendance.memberProfile?.remainingPT ?? 0}회</Badge>
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
  const authResult = await getAuthWithShop();

  if (!authResult.isAuthenticated) {
    redirect("/login");
  }

  // Members should be redirected to their my page
  if (authResult.userRole === "MEMBER") {
    redirect("/my");
  }

  // Get trainer profile if trainer
  let trainerId: string | null = null;
  if (authResult.userRole === "TRAINER") {
    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: authResult.userId },
      select: { id: true },
    });
    trainerId = trainerProfile?.id || null;
  }

  const shopFilter = buildShopFilter(authResult.shopId, authResult.isSuperAdmin);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {authResult.userRole === "ADMIN" || authResult.userRole === "SUPER_ADMIN" ? (
        <AdminDashboard shopFilter={shopFilter} />
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
