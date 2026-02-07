"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Timer,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CronLog {
  id: string;
  endpoint: string;
  status: string;
  total: number;
  sent: number;
  failed: number;
  error: string | null;
  duration: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  SUCCESS: { label: "성공", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  ERROR: { label: "오류", color: "bg-red-100 text-red-700", icon: XCircle },
  NO_DATA: { label: "데이터 없음", color: "bg-gray-100 text-gray-700", icon: MinusCircle },
};

export default function CronLogsPage() {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", "30");
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/super-admin/cron-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch cron logs:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cron 호출 로그</h1>
          <p className="text-muted-foreground">스케줄 리마인더 API 호출 기록을 확인합니다</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="SUCCESS">성공</SelectItem>
                <SelectItem value="ERROR">오류</SelectItem>
                <SelectItem value="NO_DATA">데이터 없음</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4" />
                호출 기록
              </CardTitle>
              {pagination && (
                <CardDescription>
                  총 {pagination.total.toLocaleString()}개의 기록
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>호출 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const config = STATUS_CONFIG[log.status] || STATUS_CONFIG.ERROR;
                const Icon = config.icon;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 py-3 border-b last:border-0 hover:bg-muted/50 rounded-lg px-2 -mx-2"
                  >
                    <div className={`p-2 rounded-full ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{log.endpoint}</span>
                        <Badge variant="secondary" className={config.color}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>전체: {log.total}건</span>
                        <span>발송: {log.sent}건</span>
                        {log.failed > 0 && (
                          <span className="text-red-600">실패: {log.failed}건</span>
                        )}
                        <span>{log.duration}ms</span>
                      </div>
                      {log.error && (
                        <div className="text-sm text-red-600 mt-1">
                          오류: {log.error}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(log.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {((currentPage - 1) * pagination.limit) + 1} -{" "}
                {Math.min(currentPage * pagination.limit, pagination.total)} / {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                >
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
