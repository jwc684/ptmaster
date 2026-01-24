"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  UserCog,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  overview: {
    totalShops: number;
    activeShops: number;
    totalUsers: number;
    totalMembers: number;
    totalTrainers: number;
    totalAdmins: number;
    totalPayments: number;
    totalAttendances: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  topShops: Array<{
    shop: { id: string; name: string; slug: string } | null;
    totalRevenue: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    newMembers: number;
  }>;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/super-admin/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">플랫폼 전체 현황</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">통계를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">플랫폼 전체 현황을 한눈에 확인하세요</p>
        </div>
        <Button asChild>
          <Link href="/super-admin/shops/new">
            <Building2 className="mr-2 h-4 w-4" />
            새 PT샵 등록
          </Link>
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 PT샵</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.activeShops}</div>
            <p className="text-xs text-muted-foreground">
              총 {stats.overview.totalShops}개 중 활성
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 회원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              관리자 {stats.overview.totalAdmins}명, 트레이너 {stats.overview.totalTrainers}명
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 매출</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.revenue.thisMonth)}
            </div>
            <div className="flex items-center text-xs">
              {stats.revenue.growth >= 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{stats.revenue.growth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">{stats.revenue.growth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">전월 대비</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">누적 매출</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue.total)}</div>
            <p className="text-xs text-muted-foreground">
              총 결제 {stats.overview.totalPayments}건
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Shops */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>상위 PT샵</CardTitle>
            <CardDescription>매출 기준 상위 PT샵 현황</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/shops">
              전체보기 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topShops.slice(0, 5).map((item, index) => (
              <div
                key={item.shop?.id || index}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{item.shop?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{item.shop?.slug}</p>
                  </div>
                </div>
                <div className="font-medium">{formatCurrency(item.totalRevenue)}</div>
              </div>
            ))}
            {stats.topShops.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                아직 등록된 PT샵이 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>월별 추이</CardTitle>
          <CardDescription>최근 6개월 매출 및 신규 회원</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.monthlyTrend.map((item) => (
              <div key={item.month} className="flex items-center justify-between">
                <div className="font-medium">{item.month}</div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(item.revenue)}</p>
                    <p className="text-xs text-muted-foreground">매출</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.newMembers}명</p>
                    <p className="text-xs text-muted-foreground">신규 회원</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
