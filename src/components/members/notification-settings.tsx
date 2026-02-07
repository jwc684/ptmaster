"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface NotificationSettingsProps {
  memberId: string;
  kakaoNotification: boolean;
}

export function NotificationSettings({
  memberId,
  kakaoNotification: initialValue,
}: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  async function handleToggle(checked: boolean) {
    const prev = enabled;
    setEnabled(checked); // optimistic update

    setLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kakaoNotification: checked }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      toast.success(checked ? "카카오 알림이 활성화되었습니다." : "카카오 알림이 비활성화되었습니다.");
    } catch {
      setEnabled(prev); // rollback
      toast.error("설정 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">카카오 알림톡</span>
        <Switch
          id="kakao-notification"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        PT 예약, 출석, 취소 알림을 카카오톡으로 받습니다.
      </p>
    </div>
  );
}
