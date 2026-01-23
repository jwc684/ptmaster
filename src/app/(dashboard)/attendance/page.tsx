"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Calendar, Clock, Loader2, CheckCircle, XCircle, User } from "lucide-react";

interface Member {
  id: string;
  user: { name: string };
}

interface Attendance {
  id: string;
  checkInTime: string;
  notes: string | null;
  memberProfile: {
    id: string;
    remainingPT: number;
    user: { name: string };
  };
  schedule?: {
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    scheduledAt: string;
    trainer: {
      user: { name: string };
    };
  } | null;
}

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터 상태
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [startDate, endDate, selectedMemberId]);

  async function fetchMembers() {
    try {
      const response = await fetch("/api/members?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  }

  async function fetchAttendance() {
    setLoading(true);
    try {
      let url = `/api/attendance?startDate=${startDate}&endDate=${endDate}`;
      if (selectedMemberId && selectedMemberId !== "all") {
        url += `&memberId=${selectedMemberId}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAttendances(data);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleThisMonth() {
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  }

  function handleToday() {
    const today = format(new Date(), "yyyy-MM-dd");
    setStartDate(today);
    setEndDate(today);
  }

  function handleResetFilter() {
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    setSelectedMemberId("all");
  }

  // 날짜별로 그룹화
  const groupedAttendances = attendances.reduce((groups, attendance) => {
    const date = format(new Date(attendance.checkInTime), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(attendance);
    return groups;
  }, {} as Record<string, Attendance[]>);

  const sortedDates = Object.keys(groupedAttendances).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="PT 출석"
        description="PT 출석 기록을 확인합니다."
      />

      {/* 필터 */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* 기간 선택 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Label htmlFor="startDate" className="sr-only">시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                />
                <span className="text-muted-foreground">~</span>
                <Label htmlFor="endDate" className="sr-only">종료일</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleToday}>
                오늘
              </Button>
              <Button variant="outline" size="sm" onClick={handleThisMonth}>
                이번 달
              </Button>
            </div>
          </div>

          {/* 회원 필터 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="회원 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 회원</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMemberId !== "all" && (
              <Button variant="ghost" size="sm" onClick={handleResetFilter}>
                필터 초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 출석 통계 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {startDate === endDate
                  ? format(new Date(startDate), "M월 d일", { locale: ko })
                  : `${format(new Date(startDate), "M월 d일", { locale: ko })} ~ ${format(new Date(endDate), "M월 d일", { locale: ko })}`
                } 기록
                {selectedMemberId !== "all" && members.find(m => m.id === selectedMemberId) && (
                  <Badge variant="secondary" className="ml-2">
                    {members.find(m => m.id === selectedMemberId)?.user.name}
                  </Badge>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  {attendances.filter(a => a.schedule?.status === "COMPLETED").length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium">
                  {attendances.filter(a => a.schedule?.status === "CANCELLED").length}
                </span>
              </div>
              <span className="text-xl font-bold">총 {attendances.length}건</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 출석 기록 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">출석 기록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : attendances.length > 0 ? (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(date), "M월 d일 (EEEE)", { locale: ko })}
                    <Badge variant="outline" className="ml-auto">
                      {groupedAttendances[date].length}건
                    </Badge>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                    {groupedAttendances[date].map((attendance) => {
                      const isCancelled = attendance.schedule?.status === "CANCELLED";
                      return (
                        <div
                          key={attendance.id}
                          className={`flex items-center justify-between py-2 pl-4 ${
                            isCancelled ? "opacity-70" : ""
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {isCancelled ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              <p className="font-medium">
                                {attendance.memberProfile.user.name}
                              </p>
                              {isCancelled && (
                                <Badge variant="destructive" className="text-xs">
                                  취소
                                </Badge>
                              )}
                            </div>
                            {attendance.schedule?.trainer && (
                              <p className="text-sm text-muted-foreground ml-6">
                                담당: {attendance.schedule.trainer.user.name}
                              </p>
                            )}
                            {attendance.notes && !attendance.notes.startsWith("[취소]") && (
                              <p className="text-sm text-muted-foreground ml-6">
                                {attendance.notes}
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant="outline">
                              잔여 {attendance.memberProfile.remainingPT}회
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                              <Clock className="h-3 w-3" />
                              {isCancelled ? "취소: " : ""}
                              {format(new Date(attendance.checkInTime), "HH:mm")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              출석 기록이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
