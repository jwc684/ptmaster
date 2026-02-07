"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
    <div className="flex items-start justify-between gap-4">
      <Label htmlFor="kakao-notification" className="flex flex-col gap-1 text-left">
        <span className="text-sm font-medium">카카오 알림톡</span>
        <span className="text-xs text-muted-foreground font-normal">
          수업 알림, 공지사항 등을 카카오톡으로 받습니다.
        </span>
      </Label>
      <Switch
        id="kakao-notification"
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
}
