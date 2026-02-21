"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Plus, Trash2, Timer, Dumbbell } from "lucide-react";
import { ExerciseSelector } from "./exercise-selector";
import { SetInput } from "./set-input";
import { WorkoutHistoryItem } from "./workout-history-item";
import { WorkoutDetailDialog } from "./workout-detail-dialog";

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
  order: number;
  weight: number | null;
  reps: number | null;
  durationMinutes: number | null;
  createdAt: string;
}

interface WorkoutSession {
  id: string;
  date: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  notes: string | null;
  sets: WorkoutSet[];
}

interface WorkoutClientProps {
  initialData: {
    memberProfileId: string;
    activeSession: WorkoutSession | null;
    recentSessions: WorkoutSession[];
  };
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutClient({ initialData }: WorkoutClientProps) {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(
    initialData.activeSession
  );
  const [recentSessions] = useState(initialData.recentSessions);
  const [elapsed, setElapsed] = useState(0);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);

  // Timer
  useEffect(() => {
    if (!activeSession) return;
    const startTime = new Date(activeSession.startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Start workout
  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workouts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("운동을 시작합니다!");
      router.refresh();
      // Reload active session
      const sessionRes = await fetch(`/api/workouts/${data.workout.id}`);
      const sessionData = await sessionRes.json();
      if (sessionRes.ok) {
        setActiveSession({
          ...sessionData.workout,
          date: sessionData.workout.date,
          startedAt: sessionData.workout.startedAt,
          completedAt: sessionData.workout.completedAt,
          createdAt: sessionData.workout.createdAt,
          sets: sessionData.workout.sets.map((s: WorkoutSet) => ({
            ...s,
            createdAt: s.createdAt,
          })),
        });
      }
    } catch {
      toast.error("운동 시작 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Complete workout
  const handleComplete = async () => {
    if (!activeSession) return;
    if (activeSession.sets.length === 0) {
      toast.error("최소 1개 이상의 세트를 기록해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/workouts/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("운동을 완료했습니다!");
      setActiveSession(null);
      router.refresh();
    } catch {
      toast.error("운동 완료 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Delete workout
  const handleDelete = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workouts/${activeSession.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("운동이 취소되었습니다.");
      setActiveSession(null);
      router.refresh();
    } catch {
      toast.error("운동 삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Add set
  const handleAddSet = useCallback(
    async (data: {
      exerciseId: string;
      setNumber: number;
      order: number;
      weight?: number;
      reps?: number;
      durationMinutes?: number;
    }) => {
      if (!activeSession) return;
      try {
        const res = await fetch(`/api/workouts/${activeSession.id}/sets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) {
          toast.error(result.error);
          return;
        }

        // Refresh session data
        const sessionRes = await fetch(`/api/workouts/${activeSession.id}`);
        const sessionData = await sessionRes.json();
        if (sessionRes.ok) {
          setActiveSession({
            ...sessionData.workout,
            date: sessionData.workout.date,
            startedAt: sessionData.workout.startedAt,
            completedAt: sessionData.workout.completedAt,
            createdAt: sessionData.workout.createdAt,
            sets: sessionData.workout.sets.map((s: WorkoutSet) => ({
              ...s,
              createdAt: s.createdAt,
            })),
          });
        }
      } catch {
        toast.error("세트 추가 중 오류가 발생했습니다.");
      }
    },
    [activeSession]
  );

  // Delete set
  const handleDeleteSet = async (setId: string) => {
    if (!activeSession) return;
    try {
      const res = await fetch(
        `/api/workouts/${activeSession.id}/sets?setId=${setId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setActiveSession((prev) =>
        prev
          ? { ...prev, sets: prev.sets.filter((s) => s.id !== setId) }
          : null
      );
    } catch {
      toast.error("세트 삭제 중 오류가 발생했습니다.");
    }
  };

  // Group sets by exercise
  const groupedSets = activeSession
    ? activeSession.sets.reduce(
        (acc, set) => {
          const key = set.exerciseId;
          if (!acc[key]) {
            acc[key] = { exercise: set.exercise, sets: [] };
          }
          acc[key].sets.push(set);
          return acc;
        },
        {} as Record<string, { exercise: Exercise; sets: WorkoutSet[] }>
      )
    : {};

  // Active workout view
  if (activeSession) {
    return (
      <div className="space-y-4">
        {/* Header with timer */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              운동 중
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-mono tabular-nums text-muted-foreground">
                {formatElapsed(elapsed)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={loading}
            >
              <Square className="h-4 w-4 mr-1" />
              완료
            </Button>
          </div>
        </div>

        {/* Exercise sets */}
        {Object.entries(groupedSets).length > 0 ? (
          Object.entries(groupedSets).map(([exerciseId, group]) => (
            <Card key={exerciseId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{group.exercise.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {group.exercise.type === "WEIGHT"
                      ? "중량"
                      : group.exercise.type === "CARDIO"
                        ? "유산소"
                        : "맨몸"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Existing sets */}
                {group.sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex items-center justify-between py-1.5 px-2 bg-muted/50"
                  >
                    <span className="text-sm text-muted-foreground w-8">
                      {set.setNumber}
                    </span>
                    <span className="text-sm flex-1">
                      {set.exercise.type === "WEIGHT" && (
                        <>
                          {set.weight}kg x {set.reps}회
                        </>
                      )}
                      {set.exercise.type === "CARDIO" && (
                        <>{set.durationMinutes}분</>
                      )}
                      {set.exercise.type === "BODYWEIGHT" && (
                        <>{set.reps}회</>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDeleteSet(set.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {/* Add set input */}
                <SetInput
                  exercise={group.exercise}
                  nextSetNumber={group.sets.length + 1}
                  order={group.sets[0]?.order ?? 0}
                  onAdd={handleAddSet}
                />
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              아래 버튼을 눌러 운동을 추가해주세요.
            </CardContent>
          </Card>
        )}

        {/* Add exercise button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowExerciseSelector(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          운동 추가
        </Button>

        {/* Exercise selector sheet */}
        <ExerciseSelector
          open={showExerciseSelector}
          onClose={() => setShowExerciseSelector(false)}
          onSelect={(exercise) => {
            setShowExerciseSelector(false);
            // Add first set for the exercise
            const existingOrder = Object.keys(groupedSets).length;
            handleAddSet({
              exerciseId: exercise.id,
              setNumber: 1,
              order: existingOrder,
              weight: exercise.type === "WEIGHT" ? 20 : undefined,
              reps:
                exercise.type === "WEIGHT" || exercise.type === "BODYWEIGHT"
                  ? 10
                  : undefined,
              durationMinutes: exercise.type === "CARDIO" ? 30 : undefined,
            });
          }}
          excludeIds={Object.keys(groupedSets)}
        />
      </div>
    );
  }

  // Home view (no active session)
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          운동 기록
        </h1>
        <p className="text-sm text-muted-foreground">자율 운동을 기록해보세요</p>
      </div>

      {/* Start workout button */}
      <Button
        className="w-full h-14 text-lg"
        onClick={handleStart}
        disabled={loading}
      >
        <Play className="h-5 w-5 mr-2" />
        운동 시작하기
      </Button>

      {/* Recent workout history */}
      {recentSessions.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">최근 운동</h2>
          {recentSessions.map((s) => (
            <WorkoutHistoryItem
              key={s.id}
              session={s}
              onClick={() => setDetailSession(s)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            아직 운동 기록이 없습니다.
          </CardContent>
        </Card>
      )}

      {/* Detail dialog */}
      {detailSession && (
        <WorkoutDetailDialog
          session={detailSession}
          open={!!detailSession}
          onClose={() => setDetailSession(null)}
        />
      )}
    </div>
  );
}
