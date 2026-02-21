"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Dumbbell } from "lucide-react";

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
  isCompleted: boolean;
}

interface WorkoutSession {
  id: string;
  date: string;
  startedAt: string;
  completedAt: string | null;
  sets: WorkoutSet[];
}

interface WorkoutHistoryItemProps {
  session: WorkoutSession;
  onClick: () => void;
}

export function WorkoutHistoryItem({ session, onClick }: WorkoutHistoryItemProps) {
  // Unique exercises
  const exerciseMap = new Map<string, { name: string; setCount: number }>();
  for (const set of session.sets) {
    const existing = exerciseMap.get(set.exerciseId);
    if (existing) {
      existing.setCount++;
    } else {
      exerciseMap.set(set.exerciseId, { name: set.exercise.name, setCount: 1 });
    }
  }
  const exercises = Array.from(exerciseMap.values());

  // Completion count
  const completedSets = session.sets.filter((s) => s.isCompleted).length;
  const totalSets = session.sets.length;

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

  const dateObj = new Date(session.date);
  const dateStr = dateObj.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>{dateStr}</span>
              {durationText && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span>{durationText}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Dumbbell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {exercises.map((ex, i) => (
                <span key={i} className="text-sm">
                  {ex.name}
                  <span className="text-muted-foreground ml-0.5">
                    {ex.setCount}세트
                  </span>
                  {i < exercises.length - 1 && (
                    <span className="text-muted-foreground/50 ml-1">/</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">
            {completedSets}/{totalSets} 완료
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
