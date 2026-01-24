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
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Banknote } from "lucide-react";

interface TrendData {
  date: string;
  label: string;
  count: number;
  revenue: number;
}

interface PTTrendsResponse {
  period: string;
  data: TrendData[];
  totals: {
    count: number;
    revenue: number;
  };
}

export function PTTrendsChart({ trainerId }: { trainerId?: string }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [data, setData] = useState<TrendData[]>([]);
  const [totals, setTotals] = useState({ count: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period });
        if (trainerId) params.append("trainerId", trainerId);

        const res = await fetch(`/api/stats/pt-trends?${params}`);
        if (res.ok) {
          const result: PTTrendsResponse = await res.json();
          setData(result.data);
          setTotals(result.totals);
        }
      } catch (error) {
        console.error("Failed to fetch PT trends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, trainerId]);

  const periodLabels = {
    daily: "일별",
    weekly: "주별",
    monthly: "월별",
  };

  const periodRanges = {
    daily: "최근 14일",
    weekly: "최근 12주",
    monthly: "최근 12개월",
  };

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList className="grid grid-cols-3 h-8">
            <TabsTrigger value="daily" className="text-xs px-2">일별</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs px-2">주별</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs px-2">월별</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">{periodRanges[period]}</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{totals.count}회</p>
            <p className="text-xs text-muted-foreground">{periodLabels[period]} 총 PT</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <Banknote className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold">₩{totals.revenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{periodLabels[period]} 매출</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">로딩 중...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                interval={period === "daily" ? 1 : 0}
                angle={period === "daily" ? -45 : 0}
                textAnchor={period === "daily" ? "end" : "middle"}
                height={period === "daily" ? 40 : 20}
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
                formatter={(value, name) => {
                  if (name === "count") return [`${value}회`, "PT 횟수"];
                  return [value, name];
                }}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorCount)"
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5, fill: "#3b82f6" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Revenue Chart */}
      <div className="h-32">
        {!loading && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                interval={period === "daily" ? 1 : 0}
                angle={period === "daily" ? -45 : 0}
                textAnchor={period === "daily" ? "end" : "middle"}
                height={period === "daily" ? 40 : 20}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
              />
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value) => [`₩${Number(value).toLocaleString()}`, "매출"]}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorRevenue)"
                dot={{ r: 3, fill: "#10b981" }}
                activeDot={{ r: 5, fill: "#10b981" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
