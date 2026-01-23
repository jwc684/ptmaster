"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, CheckCircle, Users } from "lucide-react";

interface Attendance {
  id: string;
  checkInTime: string;
  notes: string | null;
  memberProfile: {
    id: string;
    remainingPT: number;
    user: { name: string };
  };
}

export default function AttendancePage() {
  const [qrCode, setQrCode] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  async function fetchTodayAttendance() {
    try {
      const response = await fetch("/api/attendance");
      if (response.ok) {
        const data = await response.json();
        setAttendances(data);
        setTodayCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }

  async function handleCheckIn() {
    if (!qrCode.trim()) {
      toast.error("QR 코드를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode, notes }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      setQrCode("");
      setNotes("");
      fetchTodayAttendance();
    } catch {
      toast.error("출석 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="PT 출석"
        description="회원 PT 출석을 체크합니다."
      />

      {/* Check-in Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            출석 체크
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="QR 코드 입력"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
            className="text-lg"
          />
          <Textarea
            placeholder="PT 메모 (선택사항)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <Button onClick={handleCheckIn} disabled={isLoading} className="w-full" size="lg">
            <CheckCircle className="mr-2 h-5 w-5" />
            {isLoading ? "처리 중..." : "PT 출석 체크"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            출석 시 PT 횟수가 1회 차감됩니다.
          </p>
        </CardContent>
      </Card>

      {/* Today Stats */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">오늘 PT 출석</span>
            </div>
            <span className="text-2xl font-bold">{todayCount}명</span>
          </div>
        </CardContent>
      </Card>

      {/* Today's Attendance List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">오늘 출석 기록</CardTitle>
        </CardHeader>
        <CardContent>
          {attendances.length > 0 ? (
            <div className="space-y-3">
              {attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {attendance.memberProfile.user.name}
                    </p>
                    {attendance.notes && (
                      <p className="text-sm text-muted-foreground">
                        {attendance.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      잔여 {attendance.memberProfile.remainingPT}회
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(attendance.checkInTime).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              오늘 출석 기록이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
