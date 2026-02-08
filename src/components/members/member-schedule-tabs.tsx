"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useScheduleActions } from "@/hooks/use-schedule-actions";
import { ScheduleItemRow } from "@/components/schedule/schedule-item";
import { ScheduleDialogs } from "@/components/schedule/schedule-dialogs";
import type { ScheduleItemData } from "@/components/schedule/schedule-types";

interface ScheduleData {
  id: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
  trainerName: string;
  attendance: {
    id: string;
    checkInTime: string;
    notes: string | null;
    internalNotes: string | null;
  } | null;
}

interface MemberScheduleTabsProps {
  schedules: ScheduleData[];
  memberName: string;
  memberProfileId: string;
  remainingPT: number;
}

function toScheduleItemData(
  s: ScheduleData,
  memberName: string,
  memberProfileId: string,
  remainingPT: number
): ScheduleItemData {
  return {
    id: s.id,
    scheduledAt: s.scheduledAt,
    status: s.status as ScheduleItemData["status"],
    notes: s.notes,
    memberName,
    memberProfileId,
    remainingPT,
    trainerName: s.trainerName,
    attendance: s.attendance,
  };
}

export function MemberScheduleTabs({
  schedules,
  memberName,
  memberProfileId,
  remainingPT,
}: MemberScheduleTabsProps) {
  const router = useRouter();
  const actions = useScheduleActions({
    onSuccess: () => router.refresh(),
  });

  const now = new Date().toISOString();
  const upcoming = schedules.filter(
    (s) => s.status === "SCHEDULED" && s.scheduledAt >= now
  );
  const past = schedules.filter(
    (s) => s.status !== "SCHEDULED" || s.scheduledAt < now
  );

  return (
    <>
      <Tabs defaultValue="upcoming" className="gap-0">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming">
            예정된 스케줄
            {upcoming.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            지난 스케줄
            {past.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {past.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {upcoming.length > 0 ? (
            <div className="divide-y divide-border/30">
              {upcoming.map((schedule) => (
                <ScheduleItemRow
                  key={schedule.id}
                  schedule={toScheduleItemData(schedule, memberName, memberProfileId, remainingPT)}
                  showMemberName={false}
                  showTrainerName={true}
                  showRemainingPT={false}
                  actionLoading={actions.actionLoading}
                  onCheckIn={actions.openCheckInDialog}
                  onCancel={actions.openCancelDialog}
                  onRevert={actions.handleRevert}
                  onEdit={actions.openEditDialog}
                  onDelete={actions.openDeleteDialog}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              예정된 스케줄이 없습니다.
            </p>
          )}
        </TabsContent>
        <TabsContent value="past">
          {past.length > 0 ? (
            <div className="divide-y divide-border/30">
              {past.map((schedule) => (
                <ScheduleItemRow
                  key={schedule.id}
                  schedule={toScheduleItemData(schedule, memberName, memberProfileId, remainingPT)}
                  showMemberName={false}
                  showTrainerName={true}
                  showRemainingPT={false}
                  actionLoading={actions.actionLoading}
                  onCheckIn={actions.openCheckInDialog}
                  onCancel={actions.openCancelDialog}
                  onRevert={actions.handleRevert}
                  onEdit={actions.openEditDialog}
                  onDelete={actions.openDeleteDialog}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              지난 스케줄이 없습니다.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <ScheduleDialogs
        checkInDialogOpen={actions.checkInDialogOpen}
        setCheckInDialogOpen={actions.setCheckInDialogOpen}
        checkInNotes={actions.checkInNotes}
        setCheckInNotes={actions.setCheckInNotes}
        onCheckIn={actions.handleCheckIn}
        cancelDialogOpen={actions.cancelDialogOpen}
        setCancelDialogOpen={actions.setCancelDialogOpen}
        onCancel={actions.handleCancel}
        editDialogOpen={actions.editDialogOpen}
        setEditDialogOpen={actions.setEditDialogOpen}
        editForm={actions.editForm}
        setEditForm={actions.setEditForm}
        onEdit={actions.handleEditSchedule}
        deleteDialogOpen={actions.deleteDialogOpen}
        setDeleteDialogOpen={actions.setDeleteDialogOpen}
        onDelete={actions.handleDeleteSchedule}
        selectedSchedule={actions.selectedSchedule}
        actionLoading={actions.actionLoading}
      />
    </>
  );
}
