"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ScheduleItemData } from "@/components/schedule/schedule-types";

interface UseScheduleActionsOptions {
  onSuccess: () => void;
}

export function useScheduleActions({ onSuccess }: UseScheduleActionsOptions) {
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItemData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [checkInNotes, setCheckInNotes] = useState({
    notes: "",
    internalNotes: "",
  });

  const [editForm, setEditForm] = useState({
    date: "",
    time: "",
    notes: "",
  });

  function openCheckInDialog(schedule: ScheduleItemData) {
    setSelectedSchedule(schedule);
    setCheckInNotes({ notes: "", internalNotes: "" });
    setCheckInDialogOpen(true);
  }

  function openCancelDialog(schedule: ScheduleItemData) {
    setSelectedSchedule(schedule);
    setCancelDialogOpen(true);
  }

  function openEditDialog(schedule: ScheduleItemData) {
    setSelectedSchedule(schedule);
    const scheduledDate = new Date(schedule.scheduledAt);
    setEditForm({
      date: format(scheduledDate, "yyyy-MM-dd"),
      time: format(scheduledDate, "HH:mm"),
      notes: schedule.notes || "",
    });
    setEditDialogOpen(true);
  }

  function openDeleteDialog(schedule: ScheduleItemData) {
    setSelectedSchedule(schedule);
    setDeleteDialogOpen(true);
  }

  async function handleCheckIn() {
    if (!selectedSchedule) return;

    setActionLoading("checkIn");
    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          notes: checkInNotes.notes || undefined,
          internalNotes: checkInNotes.internalNotes || undefined,
        }),
      });

      if (res.ok) {
        toast.success("출석이 완료되었습니다.");
        setCheckInDialogOpen(false);
        setSelectedSchedule(null);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "출석 처리에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(deductPT: boolean) {
    if (!selectedSchedule) return;

    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", deductPT }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "예약이 취소되었습니다.");
        setCancelDialogOpen(false);
        setSelectedSchedule(null);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "취소 처리에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevert(scheduleId: string) {
    setActionLoading(scheduleId);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED" }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "되돌려졌습니다.");
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "되돌리기에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEditSchedule() {
    if (!selectedSchedule) return;

    setActionLoading("edit");
    try {
      const scheduledAt = new Date(`${editForm.date}T${editForm.time}`);
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
          notes: editForm.notes,
        }),
      });

      if (res.ok) {
        toast.success("일정이 수정되었습니다.");
        setEditDialogOpen(false);
        setSelectedSchedule(null);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "일정 수정에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteSchedule() {
    if (!selectedSchedule) return;

    setActionLoading("delete");
    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("일정이 삭제되었습니다.");
        setDeleteDialogOpen(false);
        setSelectedSchedule(null);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "일정 삭제에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  }

  return {
    // Dialog state
    checkInDialogOpen,
    setCheckInDialogOpen,
    cancelDialogOpen,
    setCancelDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedSchedule,
    actionLoading,

    // Form state
    checkInNotes,
    setCheckInNotes,
    editForm,
    setEditForm,

    // Open dialog actions
    openCheckInDialog,
    openCancelDialog,
    openEditDialog,
    openDeleteDialog,

    // Submit actions
    handleCheckIn,
    handleCancel,
    handleRevert,
    handleEditSchedule,
    handleDeleteSchedule,
  };
}
