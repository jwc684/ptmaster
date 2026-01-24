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
import { Receipt, CreditCard } from "lucide-react";

interface TrendData {
  date: string;
  label: string;
  count: number;
  amount: number;
}

interface PaymentTrendsResponse {
  period: string;
  data: TrendData[];
  totals: {
    count: number;
    amount: number;
  };
}

export function PaymentTrendsChart() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [data, setData] = useState<TrendData[]>([]);
  const [totals, setTotals] = useState({ count: 0, amount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats/payment-trends?period=${period}`);
        if (res.ok) {
          const result: PaymentTrendsResponse = await res.json();
          setData(result.data);
          setTotals(result.totals);
        }
      } catch (error) {
        console.error("Failed to fetch payment trends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

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
          <div className="p-2 bg-orange-100 rounded-full">
            <Receipt className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{totals.count}건</p>
            <p className="text-xs text-muted-foreground">{periodLabels[period]} 등록</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-full">
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-bold">₩{totals.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{periodLabels[period]} 결제</p>
          </div>
        </div>
      </div>

      {/* Count Chart */}
      <div className="h-36">
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
                <linearGradient id="colorPaymentCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
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
                formatter={(value: number) => [`${value}건`, "등록 건수"]}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#colorPaymentCount)"
                dot={{ r: 3, fill: "#f97316" }}
                activeDot={{ r: 5, fill: "#f97316" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Amount Chart */}
      <div className="h-36">
        {!loading && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorPaymentAmount" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(value: number) => [`₩${value.toLocaleString()}`, "결제 금액"]}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorPaymentAmount)"
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
