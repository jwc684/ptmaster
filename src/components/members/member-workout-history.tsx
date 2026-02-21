"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dumbbell, CalendarDays, Loader2, Check, CalendarPlus } from "lucide-react";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  type: string;
  category: string | null;
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
  notes: string | null;
  sets: WorkoutSet[];
}

const TYPE_LABELS: Record<string, string> = {
  WEIGHT: "중량",
  CARDIO: "유산소",
  BODYWEIGHT: "맨몸",
};

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "";
  const diffMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins >= 60) return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
  return `${mins}분`;
}

function WorkoutDetailView({ session }: { session: WorkoutSession }) {
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

  const completedSets = session.sets.filter((s) => s.isCompleted).length;
  const totalSets = session.sets.length;
  const durationText = formatDuration(session.startedAt, session.completedAt);

  const dateStr = new Date(session.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="space-y-4">
      <div className="text-sm space-y-1">
        <p>{dateStr}</p>
        {durationText && <p className="text-muted-foreground">소요 시간: {durationText}</p>}
        <p className="text-muted-foreground">
          총 {totalSets}세트 / {Object.keys(grouped).length}종목
          {totalSets > 0 && ` (${completedSets}/${totalSets} 완료)`}
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([exerciseId, group]) => (
          <div key={exerciseId} className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{group.exercise.name}</span>
              <Badge variant="secondary" className="text-xs">
                {TYPE_LABELS[group.exercise.type] || group.exercise.type}
              </Badge>
            </div>
            <div className="space-y-1">
              {group.sets.map((set) => (
                <div
                  key={set.id}
                  className={`flex items-center gap-2 text-sm pl-2 ${set.isCompleted ? "opacity-60" : ""}`}
                >
                  {set.isCompleted ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <span className="text-muted-foreground w-3.5 text-center shrink-0">{set.setNumber}</span>
                  )}
                  <span className={set.isCompleted ? "line-through" : ""}>
                    {set.exercise.type === "WEIGHT" && <>{set.weight}kg x {set.reps}회</>}
                    {set.exercise.type === "CARDIO" && <>{set.durationMinutes}분</>}
                    {set.exercise.type === "BODYWEIGHT" && <>{set.reps}회</>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {session.notes && (
        <div className="border-t pt-3">
          <p className="text-sm text-muted-foreground">{session.notes}</p>
        </div>
      )}
    </div>
  );
}

export function MemberWorkoutHistory({ memberProfileId, planHref }: { memberProfileId: string; planHref?: string }) {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  const fetchWorkouts = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "20");

      const res = await fetch(`/api/members/${memberProfileId}/workouts?${params}`);
      if (!res.ok) return;

      const data = await res.json();
      setWorkouts((prev) => cursor ? [...prev, ...data.workouts] : data.workouts);
      setNextCursor(data.nextCursor);
      setLoaded(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [memberProfileId]);

  // Load on first render when visible
  if (!loaded && !loading) {
    fetchWorkouts();
  }

  if (loading && !loaded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            운동 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              운동 기록
              {loaded && workouts.length > 0 && (
                <Badge variant="outline" className="ml-1">{workouts.length}{nextCursor ? "+" : ""}</Badge>
              )}
            </span>
            {planHref && (
              <Button asChild size="sm" variant="outline">
                <Link href={planHref}>
                  <CalendarPlus className="h-4 w-4 mr-1" />
                  운동 계획
                </Link>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {workouts.length > 0 ? (
            <div className="divide-y">
              {workouts.map((session) => {
                const exerciseMap = new Map<string, { name: string; setCount: number }>();
                for (const set of session.sets) {
                  const existing = exerciseMap.get(set.exerciseId);
                  if (existing) existing.setCount++;
                  else exerciseMap.set(set.exerciseId, { name: set.exercise.name, setCount: 1 });
                }
                const exercises = Array.from(exerciseMap.values());
                const completedSets = session.sets.filter((s) => s.isCompleted).length;
                const totalSets = session.sets.length;
                const durationText = formatDuration(session.startedAt, session.completedAt);

                const dateStr = new Date(session.date).toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                });

                return (
                  <button
                    key={session.id}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSession(session)}
                  >
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
                              <span className="text-muted-foreground ml-0.5">{ex.setCount}세트</span>
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
                  </button>
                );
              })}

              {nextCursor && (
                <div className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => fetchWorkouts(nextCursor)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    더 보기
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">운동 기록이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={(v) => !v && setSelectedSession(null)}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>운동 상세</DialogTitle>
          </DialogHeader>
          {selectedSession && <WorkoutDetailView session={selectedSession} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
