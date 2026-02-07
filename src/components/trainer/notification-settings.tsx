"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface NotificationSettingsProps {
  notifySchedule: boolean;
  notifyAttendance: boolean;
  notifyCancellation: boolean;
  notifyScheduleChange: boolean;
  notifyReminder: boolean;
}

const NOTIFICATION_TYPES = [
  { key: "notifySchedule", label: "예약 생성 알림", description: "새 PT 예약 시 회원에게 알림" },
  { key: "notifyAttendance", label: "출석 알림", description: "출석 체크 시 회원에게 알림" },
  { key: "notifyCancellation", label: "취소 알림", description: "예약 취소 시 회원에게 알림" },
  { key: "notifyScheduleChange", label: "일정 변경 알림", description: "일정 변경 시 회원에게 알림" },
  { key: "notifyReminder", label: "전일 리마인더", description: "PT 전날 회원에게 리마인더 발송" },
] as const;

type NotifyKey = (typeof NOTIFICATION_TYPES)[number]["key"];

export function TrainerNotificationSettings(props: NotificationSettingsProps) {
  const [settings, setSettings] = useState<Record<NotifyKey, boolean>>({
    notifySchedule: props.notifySchedule,
    notifyAttendance: props.notifyAttendance,
    notifyCancellation: props.notifyCancellation,
    notifyScheduleChange: props.notifyScheduleChange,
    notifyReminder: props.notifyReminder,
  });
  const [loading, setLoading] = useState<NotifyKey | null>(null);

  async function handleToggle(key: NotifyKey, checked: boolean) {
    const prev = settings[key];
    setSettings((s) => ({ ...s, [key]: checked }));
    setLoading(key);

    try {
      const res = await fetch("/api/trainers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: checked }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(checked ? "알림이 활성화되었습니다." : "알림이 비활성화되었습니다.");
    } catch {
      setSettings((s) => ({ ...s, [key]: prev }));
      toast.error("설정 변경에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {NOTIFICATION_TYPES.map(({ key, label, description }) => (
        <div key={key} className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch
            checked={settings[key]}
            onCheckedChange={(checked) => handleToggle(key, checked)}
            disabled={loading === key}
          />
        </div>
      ))}
    </div>
  );
}
