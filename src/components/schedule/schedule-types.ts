export interface ScheduleItemData {
  id: string;
  scheduledAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes: string | null;
  memberName: string;
  memberProfileId: string;
  remainingPT: number;
  trainerName?: string;
  attendance: {
    id: string;
    checkInTime: string;
    notes: string | null;
    internalNotes: string | null;
  } | null;
}

export const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  NO_SHOW: "bg-red-100 text-red-800",
};

export const statusLabels: Record<string, string> = {
  SCHEDULED: "예약됨",
  COMPLETED: "완료",
  CANCELLED: "취소됨",
  NO_SHOW: "노쇼",
};
