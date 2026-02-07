"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DauEntry {
  date: string;
  label: string;
  admin: number;
  trainer: number;
  member: number;
  total: number;
}

interface MauEntry {
  month: string;
  label: string;
  admin: number;
  trainer: number;
  member: number;
  total: number;
}

interface ActiveUsersData {
  dau: DauEntry[];
  mau: MauEntry[];
  todayDAU: number;
  thisMonthMAU: number;
}

const ROLE_COLORS = {
  admin: "#f59e0b",
  trainer: "#3b82f6",
  member: "#10b981",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  trainer: "트레이너",
  member: "회원",
};

export function ActiveUsersChart() {
  const [mode, setMode] = useState<"dau" | "mau">("dau");
  const [data, setData] = useState<ActiveUsersData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/super-admin/stats/active-users");
        if (res.ok) {
          const result: ActiveUsersData = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch active users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = mode === "dau" ? data.dau : data.mau;
  const summaryValue = mode === "dau" ? data.todayDAU : data.thisMonthMAU;
  const summaryLabel = mode === "dau" ? "오늘 활성 사용자" : "이번 달 활성 사용자";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              사용자 활성도
            </CardTitle>
            <CardDescription>
              {mode === "dau" ? "최근 30일 일별 활성 사용자 (DAU)" : "최근 12개월 월별 활성 사용자 (MAU)"}
            </CardDescription>
          </div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "dau" | "mau")}>
            <TabsList className="h-8">
              <TabsTrigger value="dau" className="text-xs px-3">DAU</TabsTrigger>
              <TabsTrigger value="mau" className="text-xs px-3">MAU</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{summaryValue}명</p>
            <p className="text-xs text-muted-foreground">{summaryLabel}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ROLE_COLORS.admin} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ROLE_COLORS.admin} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTrainer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ROLE_COLORS.trainer} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ROLE_COLORS.trainer} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMember" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ROLE_COLORS.member} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ROLE_COLORS.member} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                interval={mode === "dau" ? 2 : 0}
                angle={mode === "dau" ? -45 : 0}
                textAnchor={mode === "dau" ? "end" : "middle"}
                height={mode === "dau" ? 40 : 20}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value, name) => [
                  `${value}명`,
                  ROLE_LABELS[name as string] || name,
                ]}
                labelFormatter={(label) => mode === "dau" ? label : label}
              />
              <Legend
                formatter={(value: string) => ROLE_LABELS[value] || value}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Area
                type="monotone"
                dataKey="member"
                stackId="1"
                stroke={ROLE_COLORS.member}
                strokeWidth={2}
                fill="url(#colorMember)"
              />
              <Area
                type="monotone"
                dataKey="trainer"
                stackId="1"
                stroke={ROLE_COLORS.trainer}
                strokeWidth={2}
                fill="url(#colorTrainer)"
              />
              <Area
                type="monotone"
                dataKey="admin"
                stackId="1"
                stroke={ROLE_COLORS.admin}
                strokeWidth={2}
                fill="url(#colorAdmin)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
