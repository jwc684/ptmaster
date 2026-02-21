"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Timer, Dumbbell, Plus, Square, CalendarPlus, ChevronRight } from "lucide-react";
import { ExerciseSelector } from "./exercise-selector";
import { SetInput } from "./set-input";
import { WorkoutHistoryItem } from "./workout-history-item";
import { WorkoutDetailDialog } from "./workout-detail-dialog";
import { WeeklyCalendar } from "./weekly-calendar";

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
  isCompleted: boolean;
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

interface WeekSession {
  id: string;
  date: string;
  status: string;
}

interface WorkoutClientProps {
  initialData: {
    memberProfileId: string;
    activeSession: WorkoutSession | null;
    recentSessions: WorkoutSession[];
    weekSessions: WeekSession[];
  };
}

type ViewState = "home" | "exercise-select" | "recording";

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutClient({ initialData }: WorkoutClientProps) {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>(
    initialData.activeSession ? "recording" : "home"
  );
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(
    initialData.activeSession
  );
  const recentSessions = initialData.recentSessions;
  const [weekSessions, setWeekSessions] = useState<WeekSession[]>(initialData.weekSessions);
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialData.activeSession ? new Date(initialData.activeSession.date) : new Date()
  );
  const [elapsed, setElapsed] = useState(0);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);
  const [addingMore, setAddingMore] = useState(false);
  const [selectedDateWorkout, setSelectedDateWorkout] = useState<WorkoutSession | null>(null);
  const [loadingDateWorkout, setLoadingDateWorkout] = useState(false);

  // Timer
  useEffect(() => {
    if (!activeSession || viewState !== "recording") return;
    const startTime = new Date(activeSession.startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession, viewState]);

  // Auto-open exercise selector for exercise-select view
  useEffect(() => {
    if (viewState === "exercise-select") {
      setShowExerciseSelector(true);
    }
  }, [viewState]);

  // Fetch week sessions when date changes
  const fetchWeekSessions = useCallback(async (date: Date) => {
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const we = endOfWeek(date, { weekStartsOn: 1 });
    try {
      const res = await fetch(
        `/api/workouts?weekStart=${ws.toISOString()}&weekEnd=${we.toISOString()}`
      );
      const data = await res.json();
      if (res.ok && data.weekSessions) {
        setWeekSessions(data.weekSessions);
      }
    } catch {
      // ignore
    }
  }, []);

  // Find session for selected date
  const selectedDateSession = weekSessions.find((s) =>
    isSameDay(new Date(s.date), selectedDate)
  );

  const workoutDates = weekSessions.map((s) => s.date);

  // Refresh session data from server
  const refreshSession = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/workouts/${sessionId}`);
    const data = await res.json();
    if (res.ok) {
      setActiveSession({
        ...data.workout,
        date: data.workout.date,
        startedAt: data.workout.startedAt,
        completedAt: data.workout.completedAt,
        createdAt: data.workout.createdAt,
        sets: data.workout.sets.map((s: WorkoutSet) => ({
          ...s,
          createdAt: s.createdAt,
        })),
      });
    }
  }, []);

  // Start new workout session
  const handleStartPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.workoutId) {
          // Already in-progress session exists, load it
          await refreshSession(data.workoutId);
          setViewState("recording");
        } else {
          toast.error(data.error);
        }
        return;
      }
      await refreshSession(data.workout.id);
      setViewState("exercise-select");
    } catch {
      toast.error("운동 시작 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Resume existing session
  const handleResume = async (sessionId: string) => {
    setLoading(true);
    try {
      await refreshSession(sessionId);
      setViewState("recording");
    } catch {
      toast.error("운동 기록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Handle multi-select confirm from ExerciseSelector
  const handleExercisesConfirm = async (exercises: { id: string; name: string; type: string }[]) => {
    if (!activeSession) return;
    setShowExerciseSelector(false);

    const existingOrders = new Set(activeSession.sets.map((s) => s.order));
    let nextOrder = existingOrders.size > 0 ? Math.max(...activeSession.sets.map((s) => s.order)) + 1 : 0;

    const sets = exercises.map((ex) => {
      const order = nextOrder++;
      return {
        exerciseId: ex.id,
        setNumber: 1,
        order,
        weight: ex.type === "WEIGHT" ? 20 : undefined,
        reps: ex.type === "WEIGHT" || ex.type === "BODYWEIGHT" ? 10 : undefined,
        durationMinutes: ex.type === "CARDIO" ? 30 : undefined,
      };
    });

    try {
      const res = await fetch(`/api/workouts/${activeSession.id}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }
      await refreshSession(activeSession.id);
      setViewState("recording");
    } catch {
      toast.error("운동 추가 중 오류가 발생했습니다.");
    }
  };

  // Handle exercise selector close/cancel
  const handleExerciseSelectorClose = async () => {
    setShowExerciseSelector(false);
    if (addingMore) {
      setAddingMore(false);
      return;
    }
    // If in exercise-select view with no sets, delete session and go back
    if (viewState === "exercise-select" && activeSession && activeSession.sets.length === 0) {
      try {
        await fetch(`/api/workouts/${activeSession.id}`, { method: "DELETE" });
      } catch {
        // ignore
      }
      setActiveSession(null);
      setViewState("home");
      fetchWeekSessions(selectedDate);
    } else if (viewState === "exercise-select" && activeSession) {
      setViewState("recording");
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
      setViewState("home");
      fetchWeekSessions(selectedDate);
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
      setViewState("home");
      fetchWeekSessions(selectedDate);
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
        await refreshSession(activeSession.id);
      } catch {
        toast.error("세트 추가 중 오류가 발생했습니다.");
      }
    },
    [activeSession, refreshSession]
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

  // Toggle set completion
  const handleToggleComplete = async (setId: string, isCompleted: boolean) => {
    if (!activeSession) return;
    // Optimistic update
    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            sets: prev.sets.map((s) =>
              s.id === setId ? { ...s, isCompleted } : s
            ),
          }
        : null
    );
    try {
      const res = await fetch(
        `/api/workouts/${activeSession.id}/sets?setId=${setId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCompleted }),
        }
      );
      if (!res.ok) {
        // Revert on failure
        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                sets: prev.sets.map((s) =>
                  s.id === setId ? { ...s, isCompleted: !isCompleted } : s
                ),
              }
            : null
        );
        toast.error("세트 상태 변경에 실패했습니다.");
      }
    } catch {
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              sets: prev.sets.map((s) =>
                s.id === setId ? { ...s, isCompleted: !isCompleted } : s
              ),
            }
          : null
      );
      toast.error("세트 상태 변경에 실패했습니다.");
    }
  };

  // Fetch full workout for a specific session id
  const fetchDateWorkout = useCallback(async (sessionId: string) => {
    setLoadingDateWorkout(true);
    try {
      const res = await fetch(`/api/workouts/${sessionId}`);
      const data = await res.json();
      if (res.ok && data.workout) {
        setSelectedDateWorkout({
          ...data.workout,
          date: data.workout.date,
          startedAt: data.workout.startedAt,
          completedAt: data.workout.completedAt,
          createdAt: data.workout.createdAt,
          sets: data.workout.sets.map((s: WorkoutSet) => ({
            ...s,
            createdAt: s.createdAt,
          })),
        });
      } else {
        setSelectedDateWorkout(null);
      }
    } catch {
      setSelectedDateWorkout(null);
    } finally {
      setLoadingDateWorkout(false);
    }
  }, []);

  // When selectedDateSession changes, fetch its full data
  useEffect(() => {
    if (selectedDateSession && selectedDateSession.status === "COMPLETED") {
      fetchDateWorkout(selectedDateSession.id);
    } else {
      setSelectedDateWorkout(null);
    }
  }, [selectedDateSession, fetchDateWorkout]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    fetchWeekSessions(date);
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

  // ========== RECORDING VIEW ==========
  if (viewState === "recording" && activeSession) {
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
              <span className="text-xs text-muted-foreground">
                {format(new Date(activeSession.date), "M월 d일 (EEE)", { locale: ko })}
              </span>
              <span className="text-muted-foreground/50">|</span>
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-mono tabular-nums text-muted-foreground">
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
                    className={`flex items-center justify-between py-1.5 px-2 bg-muted/50 ${
                      set.isCompleted ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Checkbox
                        checked={set.isCompleted}
                        onCheckedChange={(checked) =>
                          handleToggleComplete(set.id, checked === true)
                        }
                      />
                      <span className="text-sm text-muted-foreground w-6">
                        {set.setNumber}
                      </span>
                      <span className={`text-sm flex-1 ${set.isCompleted ? "line-through" : ""}`}>
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
                    </div>
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
          onClick={() => {
            setAddingMore(true);
            setShowExerciseSelector(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          운동 추가
        </Button>

        {/* Exercise selector sheet (for adding more) */}
        <ExerciseSelector
          open={showExerciseSelector}
          onClose={handleExerciseSelectorClose}
          onConfirm={(exercises) => {
            setAddingMore(false);
            handleExercisesConfirm(exercises);
          }}
          excludeIds={Object.keys(groupedSets)}
        />
      </div>
    );
  }

  // ========== EXERCISE SELECT VIEW ==========
  if (viewState === "exercise-select") {
    return (
      <ExerciseSelector
        open={showExerciseSelector}
        onClose={handleExerciseSelectorClose}
        onConfirm={handleExercisesConfirm}
        excludeIds={[]}
      />
    );
  }

  // ========== HOME VIEW ==========
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          운동 기록
        </h1>
        <p className="text-sm text-muted-foreground">자율 운동을 기록해보세요</p>
      </div>

      {/* Weekly calendar */}
      <Card>
        <CardContent className="py-3 px-4">
          <WeeklyCalendar
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            workoutDates={workoutDates}
          />
        </CardContent>
      </Card>

      {/* Action button based on date state */}
      {selectedDateSession && selectedDateSession.status === "IN_PROGRESS" ? (
        <Button
          className="w-full h-14 text-lg"
          onClick={() => handleResume(selectedDateSession.id)}
          disabled={loading}
        >
          <ChevronRight className="h-5 w-5 mr-2" />
          이어서 기록하기
        </Button>
      ) : selectedDateSession && selectedDateSession.status === "COMPLETED" ? (
        <Card>
          <CardContent className="py-4 text-center text-muted-foreground text-sm">
            이 날 운동을 완료했습니다.
          </CardContent>
        </Card>
      ) : (
        <Button
          className="w-full h-14 text-lg"
          onClick={handleStartPlan}
          disabled={loading}
        >
          <CalendarPlus className="h-5 w-5 mr-2" />
          운동 계획하기
        </Button>
      )}

      {/* Separator */}
      <div className="border-t" />

      {/* Selected date's workout OR recent workout history */}
      {selectedDateWorkout ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">
            {format(selectedDate, "M월 d일", { locale: ko })} 운동
          </h2>
          <WorkoutHistoryItem
            session={selectedDateWorkout}
            onClick={() => setDetailSession(selectedDateWorkout)}
          />
        </div>
      ) : loadingDateWorkout ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          불러오는 중...
        </div>
      ) : recentSessions.length > 0 ? (
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
