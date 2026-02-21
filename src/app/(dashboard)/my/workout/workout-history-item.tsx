"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Dumbbell, Trash2 } from "lucide-react";

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
  onDelete?: (sessionId: string) => void;
}

export function WorkoutHistoryItem({ session, onClick, onDelete }: WorkoutHistoryItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const DELETE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onDelete) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    setSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!onDelete) return;
    const diff = e.touches[0].clientX - startXRef.current;
    // Only allow left swipe
    if (diff < -5) {
      setSwiping(true);
      const clamped = Math.max(diff, -120);
      currentXRef.current = clamped;
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (!onDelete) return;
    if (currentXRef.current < -DELETE_THRESHOLD) {
      // Snap to show delete button
      setOffsetX(-80);
    } else {
      setOffsetX(0);
    }
    // Delay clearing swiping to prevent click
    setTimeout(() => setSwiping(false), 50);
  };

  const handleClick = () => {
    if (swiping) return;
    if (offsetX !== 0) {
      setOffsetX(0);
      return;
    }
    onClick();
  };

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
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Delete background */}
      {onDelete && (
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center text-destructive-foreground"
          onClick={() => onDelete(session.id)}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}

      {/* Swipeable card */}
      <div
        style={{ transform: `translateX(${offsetX}px)`, transition: swiping ? "none" : "transform 0.2s ease-out" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={handleClick}
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
      </div>
    </div>
  );
}
