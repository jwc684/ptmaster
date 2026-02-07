"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Check,
  X,
  Clock,
  Loader2,
  RotateCcw,
  Pencil,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import type { ScheduleItemData } from "./schedule-types";
import { statusColors, statusLabels } from "./schedule-types";

interface ScheduleItemRowProps {
  schedule: ScheduleItemData;
  showMemberName?: boolean;
  showTrainerName?: boolean;
  showRemainingPT?: boolean;
  actionLoading: string | null;
  onCheckIn: (schedule: ScheduleItemData) => void;
  onCancel: (schedule: ScheduleItemData) => void;
  onRevert: (scheduleId: string) => void;
  onEdit: (schedule: ScheduleItemData) => void;
  onDelete: (schedule: ScheduleItemData) => void;
  onClick?: (schedule: ScheduleItemData) => void;
}

export function ScheduleItemRow({
  schedule,
  showMemberName = true,
  showTrainerName = false,
  showRemainingPT = false,
  actionLoading,
  onCheckIn,
  onCancel,
  onRevert,
  onEdit,
  onDelete,
  onClick,
}: ScheduleItemRowProps) {
  const isScheduled = schedule.status === "SCHEDULED";
  const isCompleted = schedule.status === "COMPLETED";
  const isCancelled = schedule.status === "CANCELLED";

  const statusIcon = (
    <div
      className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        isCompleted
          ? "bg-green-500/10"
          : isCancelled
          ? "bg-gray-500/10"
          : schedule.status === "NO_SHOW"
          ? "bg-red-500/10"
          : "bg-blue-500/10"
      }`}
    >
      {isCompleted ? (
        <Check className="h-5 w-5 text-green-500" />
      ) : isCancelled ? (
        <X className="h-5 w-5 text-gray-500" />
      ) : schedule.status === "NO_SHOW" ? (
        <X className="h-5 w-5 text-red-500" />
      ) : (
        <Clock className="h-5 w-5 text-blue-500" />
      )}
    </div>
  );

  const info = (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {showMemberName && (
          <p className="text-[15px] font-semibold text-foreground truncate">
            {schedule.memberName}
          </p>
        )}
        {!showMemberName && (
          <p className="text-[15px] font-semibold text-foreground truncate">
            {format(new Date(schedule.scheduledAt), "M월 d일")}
          </p>
        )}
        <Badge className={`text-xs ${statusColors[schedule.status]}`}>
          {statusLabels[schedule.status]}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span>{format(new Date(schedule.scheduledAt), "a h:mm", { locale: ko })}</span>
        {showTrainerName && schedule.trainerName && (
          <span className="truncate">· {schedule.trainerName}</span>
        )}
      </div>
      {schedule.notes && (
        <p className="text-[12px] text-muted-foreground/70 mt-0.5 truncate">
          {schedule.notes}
        </p>
      )}
      {schedule.attendance?.notes && (
        <div className="flex items-center gap-1 mt-0.5">
          <MessageSquare className="h-3 w-3 text-muted-foreground/70 flex-shrink-0" />
          <p className="text-[12px] text-muted-foreground/70 truncate">
            {schedule.attendance.notes}
          </p>
        </div>
      )}
      {schedule.attendance?.internalNotes && (
        <div className="flex items-center gap-1 mt-0.5">
          <Lock className="h-3 w-3 text-orange-500 flex-shrink-0" />
          <p className="text-[12px] text-orange-600 dark:text-orange-400 truncate">
            {schedule.attendance.internalNotes}
          </p>
        </div>
      )}
    </div>
  );

  // Desktop action buttons (hidden on mobile)
  const desktopActions = (
    <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
      {showRemainingPT && (
        <Badge
          variant={schedule.remainingPT > 0 ? "outline" : "secondary"}
          className="text-xs"
        >
          {schedule.remainingPT}
        </Badge>
      )}

      {isScheduled && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(schedule);
            }}
            disabled={!!actionLoading}
            title="취소"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onCheckIn(schedule);
            }}
            disabled={!!actionLoading}
            title="출석"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </>
      )}

      {(isCompleted || isCancelled) && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onRevert(schedule.id);
          }}
          disabled={actionLoading === schedule.id}
          title="되돌리기"
        >
          {actionLoading === schedule.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(schedule)}>
            <Pencil className="h-4 w-4 mr-2" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(schedule)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Mobile: check-in + cancel visible on card; swipe reveals edit/delete
  const mobileActions = isScheduled ? (
    <div className="flex sm:hidden items-center gap-1 flex-shrink-0">
      <Button
        size="sm"
        variant="outline"
        className="h-7 w-7 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onCancel(schedule);
        }}
        disabled={!!actionLoading}
        title="취소"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        className="h-7 w-7 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onCheckIn(schedule);
        }}
        disabled={!!actionLoading}
        title="출석"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
    </div>
  ) : (isCompleted || isCancelled) ? (
    <div className="flex sm:hidden items-center flex-shrink-0">
      <Button
        size="sm"
        variant="outline"
        className="h-7 w-7 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onRevert(schedule.id);
        }}
        disabled={actionLoading === schedule.id}
        title="되돌리기"
      >
        {actionLoading === schedule.id ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  ) : null;

  const swipeActions = (
    <div className="flex h-full">
      <button
        className="flex items-center justify-center w-[54px] bg-blue-500 text-white"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(schedule);
        }}
      >
        <Pencil className="h-5 w-5" />
      </button>
      <button
        className="flex items-center justify-center w-[54px] bg-red-500 text-white"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(schedule);
        }}
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );

  const rowContent = (
    <div
      className="flex items-center gap-3 px-4 py-4 hover:bg-accent/30 transition-colors cursor-pointer"
      onClick={() => onClick?.(schedule)}
    >
      {statusIcon}
      {info}
      {mobileActions}
      {desktopActions}
    </div>
  );

  return (
    <>
      {/* Mobile: swipeable */}
      <div className="sm:hidden">
        <SwipeableRow
          actions={swipeActions}
          actionWidth={108}
        >
          {rowContent}
        </SwipeableRow>
      </div>
      {/* Desktop: plain row */}
      <div className="hidden sm:block">{rowContent}</div>
    </>
  );
}
