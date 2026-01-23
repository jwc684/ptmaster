"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, Loader2 } from "lucide-react";

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
    trainer: {
      user: { name: string };
    };
  } | null;
}

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  async function fetchAttendance() {
    setLoading(true);
    try {
      const response = await fetch(`/api/attendance?date=${selectedDate}`);
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

  function handleToday() {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="PT 출석"
        description="PT 출석 기록을 확인합니다."
      />

      {/* 날짜 선택 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="date" className="sr-only">날짜 선택</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleToday}>
              오늘
            </Button>
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
                {format(new Date(selectedDate), "M월 d일", { locale: ko })} 출석
              </span>
            </div>
            <span className="text-2xl font-bold">{attendances.length}명</span>
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
            <div className="space-y-3">
              {attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {attendance.memberProfile.user.name}
                    </p>
                    {attendance.schedule?.trainer && (
                      <p className="text-sm text-muted-foreground">
                        담당: {attendance.schedule.trainer.user.name}
                      </p>
                    )}
                    {attendance.notes && (
                      <p className="text-sm text-muted-foreground">
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
                      {format(new Date(attendance.checkInTime), "HH:mm")}
                    </div>
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
