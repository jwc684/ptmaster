"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ScheduleItemData } from "./schedule-types";
import { statusLabels } from "./schedule-types";

interface ScheduleDialogsProps {
  // Check-in dialog
  checkInDialogOpen: boolean;
  setCheckInDialogOpen: (open: boolean) => void;
  checkInNotes: { notes: string; internalNotes: string };
  setCheckInNotes: (notes: { notes: string; internalNotes: string }) => void;
  onCheckIn: () => void;

  // Cancel dialog
  cancelDialogOpen: boolean;
  setCancelDialogOpen: (open: boolean) => void;
  onCancel: (deductPT: boolean) => void;

  // Edit dialog
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  editForm: { date: string; time: string; notes: string };
  setEditForm: (form: { date: string; time: string; notes: string }) => void;
  onEdit: () => void;

  // Delete dialog
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  onDelete: () => void;

  // Shared
  selectedSchedule: ScheduleItemData | null;
  actionLoading: string | null;
}

export function ScheduleDialogs({
  checkInDialogOpen,
  setCheckInDialogOpen,
  checkInNotes,
  setCheckInNotes,
  onCheckIn,
  cancelDialogOpen,
  setCancelDialogOpen,
  onCancel,
  editDialogOpen,
  setEditDialogOpen,
  editForm,
  setEditForm,
  onEdit,
  deleteDialogOpen,
  setDeleteDialogOpen,
  onDelete,
  selectedSchedule,
  actionLoading,
}: ScheduleDialogsProps) {
  return (
    <>
      {/* 출석 체크 다이얼로그 */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PT 출석 체크</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedSchedule.memberName}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedSchedule.scheduledAt), "M월 d일 HH:mm", { locale: ko })}
                </p>
                <p className="text-sm text-muted-foreground">
                  잔여 PT: {selectedSchedule.remainingPT}회 → {selectedSchedule.remainingPT - 1}회
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>공유 메모 (회원에게 보이는 메모)</Label>
              <Textarea
                placeholder="오늘 수업 내용, 다음 수업 안내 등"
                value={checkInNotes.notes}
                onChange={(e) =>
                  setCheckInNotes({ ...checkInNotes, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>내부 메모 (트레이너/관리자만 보이는 메모)</Label>
              <Textarea
                placeholder="컨디션, 특이사항 등 내부 기록용"
                value={checkInNotes.internalNotes}
                onChange={(e) =>
                  setCheckInNotes({ ...checkInNotes, internalNotes: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCheckInDialogOpen(false)}
                disabled={actionLoading === "checkIn"}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={onCheckIn}
                disabled={actionLoading === "checkIn"}
                className="flex-1"
              >
                {actionLoading === "checkIn" ? "처리 중..." : "출석 완료"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 예약 취소 다이얼로그 */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 취소</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedSchedule.memberName}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedSchedule.scheduledAt), "M월 d일 HH:mm", { locale: ko })}
                </p>
                <p className="text-sm text-muted-foreground">
                  현재 잔여 PT: {selectedSchedule.remainingPT}회
                </p>
              </div>
            )}

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">PT 복구 여부를 선택해주세요</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                일정 생성 시 차감된 PT를 복구하거나, 노쇼 등의 사유로 차감을 유지할 수 있습니다.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={actionLoading === "cancel"}
                className="flex-1"
              >
                돌아가기
              </Button>
              <Button
                variant="default"
                onClick={() => onCancel(false)}
                disabled={actionLoading === "cancel"}
                className="flex-1"
              >
                {actionLoading === "cancel" ? "처리 중..." : "PT 복구"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => onCancel(true)}
                disabled={actionLoading === "cancel"}
                className="flex-1"
              >
                {actionLoading === "cancel" ? "처리 중..." : "PT 차감 유지"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일정 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedSchedule.memberName}</p>
                <p className="text-sm text-muted-foreground">
                  {statusLabels[selectedSchedule.status]}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>시간</Label>
                <Input
                  type="time"
                  value={editForm.time}
                  onChange={(e) =>
                    setEditForm({ ...editForm, time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                placeholder="메모를 입력하세요"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <Button
              onClick={onEdit}
              disabled={actionLoading === "edit"}
              className="w-full"
            >
              {actionLoading === "edit" ? "수정 중..." : "수정하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSchedule && (
                <>
                  {selectedSchedule.memberName}님의{" "}
                  {format(new Date(selectedSchedule.scheduledAt), "M월 d일 HH:mm", { locale: ko })}{" "}
                  예약을 삭제합니다.
                  {selectedSchedule.status === "SCHEDULED" && (
                    <span className="block mt-1 text-blue-600 dark:text-blue-400">
                      예약 상태이므로 PT 1회가 복구됩니다.
                    </span>
                  )}
                  <span className="block mt-1">이 작업은 되돌릴 수 없습니다.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={actionLoading === "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === "delete" ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
