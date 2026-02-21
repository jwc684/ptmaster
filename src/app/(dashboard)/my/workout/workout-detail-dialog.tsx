"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Exercise {
  id: string;
  name: string;
  type: string;
}

interface WorkoutSet {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  durationMinutes: number | null;
}

interface WorkoutSession {
  id: string;
  date: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  sets: WorkoutSet[];
}

interface WorkoutDetailDialogProps {
  session: WorkoutSession;
  open: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  WEIGHT: "중량",
  CARDIO: "유산소",
  BODYWEIGHT: "맨몸",
};

export function WorkoutDetailDialog({
  session,
  open,
  onClose,
}: WorkoutDetailDialogProps) {
  // Group sets by exercise
  const grouped = session.sets.reduce(
    (acc, set) => {
      if (!acc[set.exerciseId]) {
        acc[set.exerciseId] = { exercise: set.exercise, sets: [] };
      }
      acc[set.exerciseId].sets.push(set);
      return acc;
    },
    {} as Record<string, { exercise: Exercise; sets: WorkoutSet[] }>
  );

  const dateObj = new Date(session.date);
  const dateStr = dateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // Duration
  let durationText = "";
  if (session.completedAt && session.startedAt) {
    const diffMs =
      new Date(session.completedAt).getTime() -
      new Date(session.startedAt).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins >= 60) {
      durationText = `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
    } else {
      durationText = `${mins}분`;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>운동 상세</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and duration */}
          <div className="text-sm space-y-1">
            <p>{dateStr}</p>
            {durationText && (
              <p className="text-muted-foreground">소요 시간: {durationText}</p>
            )}
            <p className="text-muted-foreground">
              총 {session.sets.length}세트 / {Object.keys(grouped).length}종목
            </p>
          </div>

          {/* Exercises */}
          <div className="space-y-3">
            {Object.entries(grouped).map(([exerciseId, group]) => (
              <div key={exerciseId} className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">
                    {group.exercise.name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {TYPE_LABELS[group.exercise.type] || group.exercise.type}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {group.sets.map((set) => (
                    <div
                      key={set.id}
                      className="flex items-center gap-2 text-sm pl-2"
                    >
                      <span className="text-muted-foreground w-6">
                        {set.setNumber}
                      </span>
                      {set.exercise.type === "WEIGHT" && (
                        <span>
                          {set.weight}kg x {set.reps}회
                        </span>
                      )}
                      {set.exercise.type === "CARDIO" && (
                        <span>{set.durationMinutes}분</span>
                      )}
                      {set.exercise.type === "BODYWEIGHT" && (
                        <span>{set.reps}회</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {session.notes && (
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">{session.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
