"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  shopId: string | null;
  shopName: string | null;
  actionType: string;
  page: string;
  action: string | null;
  targetId: string | null;
  targetType: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterOptions {
  shops: Array<{ id: string; name: string }>;
  roles: string[];
  actionTypes: Array<{ value: string; label: string }>;
}

const ACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  PAGE_VIEW: <Eye className="h-4 w-4" />,
  CREATE: <Plus className="h-4 w-4" />,
  UPDATE: <Pencil className="h-4 w-4" />,
  DELETE: <Trash2 className="h-4 w-4" />,
  LOGIN: <LogIn className="h-4 w-4" />,
  LOGOUT: <LogOut className="h-4 w-4" />,
  API_CALL: <Globe className="h-4 w-4" />,
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  PAGE_VIEW: "bg-blue-100 text-blue-700",
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  API_CALL: "bg-cyan-100 text-cyan-700",
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  PAGE_VIEW: "조회",
  CREATE: "생성",
  UPDATE: "수정",
  DELETE: "삭제",
  LOGIN: "로그인",
  LOGOUT: "로그아웃",
  API_CALL: "API",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TRAINER: "트레이너",
  MEMBER: "회원",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  TRAINER: "bg-green-100 text-green-700",
  MEMBER: "bg-gray-100 text-gray-700",
};

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [shopId, setShopId] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("all");
  const [actionType, setActionType] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", "30");
      if (search) params.set("search", search);
      if (shopId && shopId !== "all") params.set("shopId", shopId);
      if (userRole && userRole !== "all") params.set("userRole", userRole);
      if (actionType && actionType !== "all") params.set("actionType", actionType);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/super-admin/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, shopId, userRole, actionType, startDate, endDate]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch("/api/super-admin/logs/filters");
      if (response.ok) {
        const data = await response.json();
        setFilterOptions(data);
      }
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const resetFilters = () => {
    setSearch("");
    setShopId("all");
    setUserRole("all");
    setActionType("all");
    setStartDate("");
    setEndDate("");
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
          <h1 className="text-3xl font-bold tracking-tight">접근 기록</h1>
          <p className="text-muted-foreground">사용자 접근 및 활동 기록을 확인합니다</p>
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
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="검색 (이름, 페이지, 액션)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={shopId} onValueChange={setShopId}>
                <SelectTrigger>
                  <SelectValue placeholder="PT샵 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 PT샵</SelectItem>
                  {filterOptions?.shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger>
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 역할</SelectItem>
                  {filterOptions?.roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role] || role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="액션 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 액션</SelectItem>
                  {filterOptions?.actionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  <Search className="mr-2 h-4 w-4" />
                  검색
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  초기화
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                접근 기록
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
              {[...Array(10)].map((_, i) => (
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
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>접근 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 py-3 border-b last:border-0 hover:bg-muted/50 rounded-lg px-2 -mx-2"
                >
                  <div
                    className={`p-2 rounded-full ${ACTION_TYPE_COLORS[log.actionType] || "bg-gray-100"}`}
                  >
                    {ACTION_TYPE_ICONS[log.actionType] || <Activity className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{log.userName}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${ROLE_COLORS[log.userRole] || ""}`}
                      >
                        {ROLE_LABELS[log.userRole] || log.userRole}
                      </Badge>
                      {log.shopName && (
                        <Badge variant="outline" className="text-xs">
                          {log.shopName}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">
                        {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                      </span>
                      {" - "}
                      <code className="text-xs bg-muted px-1 rounded">{log.page}</code>
                      {log.action && (
                        <span className="ml-2 text-foreground">{log.action}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                      <span>{formatDateTime(log.createdAt)}</span>
                      {log.ipAddress && (
                        <span className="text-muted-foreground/70">IP: {log.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
