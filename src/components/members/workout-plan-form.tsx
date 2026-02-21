"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Trash2,
  Loader2,
  CalendarPlus,
} from "lucide-react";
import { ExerciseSelector } from "@/app/(dashboard)/my/workout/exercise-selector";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  type: string;
}

interface PlanSet {
  weight?: number;
  reps?: number;
  durationMinutes?: number;
}

interface PlanExercise {
  exercise: Exercise;
  sets: PlanSet[];
}

interface WorkoutPlanFormProps {
  memberProfileId: string;
  memberName: string;
  backHref: string;
}

type HistoryEntry = {
  sets: { setNumber: number; weight: number | null; reps: number | null; durationMinutes: number | null }[];
  completedAt: string;
};

export function WorkoutPlanForm({ memberProfileId, memberName, backHref }: WorkoutPlanFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchHistory = useCallback(async (exerciseIds: string[]): Promise<Record<string, HistoryEntry>> => {
    try {
      const ids = exerciseIds.join(",");
      const res = await fetch(`/api/members/${memberProfileId}/workouts/exercise-history?exerciseIds=${ids}`);
      if (res.ok) return await res.json();
    } catch {
      // ignore
    }
    return {};
  }, [memberProfileId]);

  const handleExercisesConfirm = async (selected: Exercise[]) => {
    setShowSelector(false);

    const historyMap = await fetchHistory(selected.map((e) => e.id));

    const newExercises: PlanExercise[] = selected.map((ex) => {
      const history = historyMap[ex.id];
      if (history && history.sets.length > 0) {
        return {
          exercise: ex,
          sets: history.sets.map((s) => ({
            weight: s.weight ?? undefined,
            reps: s.reps ?? undefined,
            durationMinutes: s.durationMinutes ?? undefined,
          })),
        };
      }
      // Default sets based on exercise type
      return {
        exercise: ex,
        sets: [{
          weight: ex.type === "WEIGHT" ? 20 : undefined,
          reps: ex.type === "WEIGHT" || ex.type === "BODYWEIGHT" ? 10 : undefined,
          durationMinutes: ex.type === "CARDIO" ? 30 : undefined,
        }],
      };
    });

    setExercises((prev) => [...prev, ...newExercises]);
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const ex = next[exIdx];
      const lastSet = ex.sets[ex.sets.length - 1];
      next[exIdx] = {
        ...ex,
        sets: [...ex.sets, { ...lastSet }],
      };
      return next;
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const ex = next[exIdx];
      if (ex.sets.length <= 1) return prev;
      next[exIdx] = {
        ...ex,
        sets: ex.sets.filter((_, i) => i !== setIdx),
      };
      return next;
    });
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof PlanSet, value: number | undefined) => {
    setExercises((prev) => {
      const next = [...prev];
      const ex = next[exIdx];
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      next[exIdx] = { ...ex, sets };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!date) {
      toast.error("날짜를 선택해주세요.");
      return;
    }
    if (exercises.length === 0) {
      toast.error("최소 1개의 운동을 추가해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/members/${memberProfileId}/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          exercises: exercises.map((ex) => ({
            exerciseId: ex.exercise.id,
            sets: ex.sets.map((s) => ({
              weight: s.weight,
              reps: s.reps,
              durationMinutes: s.durationMinutes,
            })),
          })),
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }

      toast.success("운동 계획이 추가되었습니다.");
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("운동 계획 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const excludeIds = exercises.map((e) => e.exercise.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarPlus className="h-5 w-5" />
          운동 계획 추가
        </h1>
        <p className="text-sm text-muted-foreground">{memberName}님의 운동 계획</p>
      </div>

      {/* Date selector */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Label>날짜</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>메모 (선택)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="운동 계획 메모"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Exercise list */}
      {exercises.map((planEx, exIdx) => (
        <Card key={`${planEx.exercise.id}-${exIdx}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                {planEx.exercise.name}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {planEx.exercise.type === "WEIGHT"
                    ? "중량"
                    : planEx.exercise.type === "CARDIO"
                      ? "유산소"
                      : "맨몸"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => removeExercise(exIdx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {planEx.sets.map((set, setIdx) => (
              <div key={setIdx} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-6">{setIdx + 1}</span>

                {planEx.exercise.type === "WEIGHT" && (
                  <>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={set.weight ?? ""}
                      onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="h-8 w-20 text-sm"
                      placeholder="kg"
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={set.reps ?? ""}
                      onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-8 w-16 text-sm"
                      placeholder="횟수"
                    />
                    <span className="text-xs text-muted-foreground">회</span>
                  </>
                )}

                {planEx.exercise.type === "CARDIO" && (
                  <>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={set.durationMinutes ?? ""}
                      onChange={(e) => updateSet(exIdx, setIdx, "durationMinutes", e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-8 w-20 text-sm"
                      placeholder="분"
                    />
                    <span className="text-xs text-muted-foreground">분</span>
                  </>
                )}

                {planEx.exercise.type === "BODYWEIGHT" && (
                  <>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={set.reps ?? ""}
                      onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-8 w-20 text-sm"
                      placeholder="횟수"
                    />
                    <span className="text-xs text-muted-foreground">회</span>
                  </>
                )}

                {planEx.sets.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => removeSet(exIdx, setIdx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => addSet(exIdx)}
            >
              <Plus className="h-3 w-3 mr-1" />
              세트 추가
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Add exercise button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowSelector(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        운동 추가
      </Button>

      {/* Submit */}
      {exercises.length > 0 && (
        <Button
          className="w-full h-12"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CalendarPlus className="h-4 w-4 mr-2" />
          )}
          운동 계획 저장
        </Button>
      )}

      {/* Exercise selector */}
      <ExerciseSelector
        open={showSelector}
        onClose={() => setShowSelector(false)}
        onConfirm={handleExercisesConfirm}
        excludeIds={excludeIds}
      />
    </div>
  );
}
