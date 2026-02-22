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
import { Trash2, Timer, Dumbbell, Plus, Square, CalendarPlus, ChevronRight, ArrowLeft } from "lucide-react";
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
  autoStart?: boolean;
}

type ViewState = "home" | "exercise-select" | "recording";

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WorkoutClient({ initialData, autoStart }: WorkoutClientProps) {
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
          // Session already exists on this date - check its status
          const existingRes = await fetch(`/api/workouts/${data.workoutId}`);
          const existingData = await existingRes.json();
          if (existingRes.ok && existingData.workout) {
            const status = existingData.workout.status;
            if (status === "PLANNED") {
              // Start the planned workout
              await handleStartPlanned(data.workoutId);
              return;
            } else if (status === "IN_PROGRESS") {
              await refreshSession(data.workoutId);
              setViewState("recording");
              return;
            }
          }
          toast.error(data.error);
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

  // Auto-start workout planning when navigated with autoStart
  const [autoStarted, setAutoStarted] = useState(false);
  useEffect(() => {
    if (autoStart && !autoStarted && viewState === "home" && !initialData.activeSession) {
      setAutoStarted(true);
      handleStartPlan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, autoStarted]);

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

  // Start a PLANNED workout (transition to IN_PROGRESS)
  const handleStartPlanned = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workouts/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      await refreshSession(sessionId);
      fetchWeekSessions(selectedDate);
      setViewState("recording");
    } catch {
      toast.error("운동 시작 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Handle multi-select confirm from ExerciseSelector
  const handleExercisesConfirm = async (exercises: { id: string; name: string; type: string }[]) => {
    if (!activeSession) return;
    // Do NOT call setShowExerciseSelector(false) here.
    // The Sheet is already being closed by the caller (onConfirm callback or onOpenChange).
    // Calling it here triggers handleExerciseSelectorClose before sets are saved,
    // which checks activeSession.sets.length === 0 and deletes the session.

    const existingOrders = new Set(activeSession.sets.map((s) => s.order));
    let nextOrder = existingOrders.size > 0 ? Math.max(...activeSession.sets.map((s) => s.order)) + 1 : 0;

    // Fetch last completed workout data for selected exercises
    type HistoryEntry = {
      sets: { setNumber: number; weight: number | null; reps: number | null; durationMinutes: number | null }[];
      completedAt: string;
    };
    let historyMap: Record<string, HistoryEntry> = {};
    try {
      const ids = exercises.map((e) => e.id).join(",");
      const histRes = await fetch(`/api/workouts/exercise-history?exerciseIds=${ids}`);
      if (histRes.ok) {
        historyMap = await histRes.json();
      }
    } catch {
      // Fallback to defaults if history fetch fails
    }

    const sets = exercises.flatMap((ex) => {
      const order = nextOrder++;
      const history = historyMap[ex.id];
      if (history && history.sets.length > 0) {
        return history.sets.map((s) => ({
          exerciseId: ex.id,
          setNumber: s.setNumber,
          order,
          weight: s.weight ?? undefined,
          reps: s.reps ?? undefined,
          durationMinutes: s.durationMinutes ?? undefined,
        }));
      }
      // Default fallback
      return [{
        exerciseId: ex.id,
        setNumber: 1,
        order,
        weight: ex.type === "WEIGHT" ? 20 : undefined,
        reps: ex.type === "WEIGHT" || ex.type === "BODYWEIGHT" ? 10 : undefined,
        durationMinutes: ex.type === "CARDIO" ? 30 : undefined,
      }];
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
        setAddingMore(false);
        return;
      }
      await refreshSession(activeSession.id);
      setShowExerciseSelector(false);
      setAddingMore(false);
      setViewState("recording");
    } catch {
      toast.error("운동 추가 중 오류가 발생했습니다.");
      setShowExerciseSelector(false);
      setAddingMore(false);
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
      setShowExerciseSelector(false);
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
      setShowExerciseSelector(false);
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
    if (selectedDateSession && (selectedDateSession.status === "COMPLETED" || selectedDateSession.status === "PLANNED")) {
      fetchDateWorkout(selectedDateSession.id);
    } else {
      setSelectedDateWorkout(null);
    }
  }, [selectedDateSession, fetchDateWorkout]);

  // Delete a completed workout session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/workouts/${sessionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("운동 기록이 삭제되었습니다.");
      setDetailSession(null);
      setSelectedDateWorkout(null);
      fetchWeekSessions(selectedDate);
      router.refresh();
    } catch {
      toast.error("운동 삭제 중 오류가 발생했습니다.");
    }
  };

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

  // ========== RECORDING VIEW (fullscreen overlay) ==========
  if (viewState === "recording" && activeSession) {
    const completedCount = activeSession.sets.filter((s) => s.isCompleted).length;
    const totalCount = activeSession.sets.length;

    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        {/* Sticky header */}
        <div className="shrink-0 border-b bg-background">
          <div className="flex items-center justify-between px-4 h-14">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => { setShowExerciseSelector(false); setViewState("home"); }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  운동 중
                </h1>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(activeSession.date), "M월 d일 (EEE)", { locale: ko })}
                </span>
              </div>
              {totalCount > 0 && (
                <Badge variant="secondary">
                  {completedCount}/{totalCount} 완료
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable exercise sets */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-4 pb-28">
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
                      defaultWeight={group.sets[group.sets.length - 1]?.weight ?? undefined}
                      defaultReps={group.sets[group.sets.length - 1]?.reps ?? undefined}
                      defaultDuration={group.sets[group.sets.length - 1]?.durationMinutes ?? undefined}
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
          </div>
        </div>

        {/* Fixed bottom action bar */}
        <div className="shrink-0 border-t bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setAddingMore(true);
                setShowExerciseSelector(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              운동 추가
            </Button>
            <Button
              className="flex-1"
              onClick={handleComplete}
              disabled={loading || totalCount === 0}
            >
              <Square className="h-4 w-4 mr-2" />
              운동 완료
            </Button>
          </div>
        </div>

        {/* Exercise selector sheet (for adding more) */}
        <ExerciseSelector
          open={showExerciseSelector}
          onClose={handleExerciseSelectorClose}
          onConfirm={handleExercisesConfirm}
          excludeIds={Object.keys(groupedSets)}
        />
      </div>
    );
  }

  // ========== EXERCISE SELECT VIEW (fullscreen) ==========
  if (viewState === "exercise-select") {
    return (
      <div className="fixed inset-0 z-[60] bg-background">
        <ExerciseSelector
          open={showExerciseSelector}
          onClose={handleExerciseSelectorClose}
          onConfirm={handleExercisesConfirm}
          excludeIds={[]}
        />
      </div>
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
            weekSessions={weekSessions}
          />
        </CardContent>
      </Card>

      {/* Action button based on date state */}
      {selectedDateSession && selectedDateSession.status === "PLANNED" ? (
        <Button
          className="w-full h-14 text-lg"
          onClick={() => handleStartPlanned(selectedDateSession.id)}
          disabled={loading}
        >
          <Dumbbell className="h-5 w-5 mr-2" />
          운동 시작
        </Button>
      ) : selectedDateSession && selectedDateSession.status === "IN_PROGRESS" ? (
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
      {selectedDateWorkout && selectedDateWorkout.status === "PLANNED" ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            {format(selectedDate, "M월 d일", { locale: ko })} 운동 계획
            <Badge variant="outline" className="text-amber-600 border-amber-400">계획됨</Badge>
          </h2>
          {(() => {
            const grouped = selectedDateWorkout.sets.reduce(
              (acc, set) => {
                if (!acc[set.exerciseId]) {
                  acc[set.exerciseId] = { exercise: set.exercise, sets: [] };
                }
                acc[set.exerciseId].sets.push(set);
                return acc;
              },
              {} as Record<string, { exercise: Exercise; sets: WorkoutSet[] }>
            );
            return (
              <Card>
                <CardContent className="py-3 space-y-3">
                  {Object.entries(grouped).map(([exId, group]) => (
                    <div key={exId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{group.exercise.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.exercise.type === "WEIGHT" ? "중량" : group.exercise.type === "CARDIO" ? "유산소" : "맨몸"}
                        </Badge>
                      </div>
                      <div className="space-y-0.5 pl-2">
                        {group.sets.map((set) => (
                          <div key={set.id} className="text-sm text-muted-foreground">
                            {set.setNumber}세트:&nbsp;
                            {set.exercise.type === "WEIGHT" && <>{set.weight}kg x {set.reps}회</>}
                            {set.exercise.type === "CARDIO" && <>{set.durationMinutes}분</>}
                            {set.exercise.type === "BODYWEIGHT" && <>{set.reps}회</>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedDateWorkout.notes && (
                    <p className="text-sm text-muted-foreground border-t pt-2">{selectedDateWorkout.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      ) : selectedDateWorkout ? (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">
            {format(selectedDate, "M월 d일", { locale: ko })} 운동
          </h2>
          <WorkoutHistoryItem
            session={selectedDateWorkout}
            onClick={() => setDetailSession(selectedDateWorkout)}
            onDelete={handleDeleteSession}
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
              onDelete={handleDeleteSession}
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
          onDelete={handleDeleteSession}
        />
      )}
    </div>
  );
}
