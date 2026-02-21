"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  type: string;
  isSystem: boolean;
}

interface ExerciseSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  excludeIds?: string[];
}

const TYPE_LABELS: Record<string, string> = {
  WEIGHT: "중량",
  CARDIO: "유산소",
  BODYWEIGHT: "맨몸",
};

export function ExerciseSelector({
  open,
  onClose,
  onSelect,
  excludeIds = [],
}: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tab, setTab] = useState("WEIGHT");
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/exercises")
      .then((res) => res.json())
      .then((data) => {
        if (data.exercises) setExercises(data.exercises);
      })
      .catch(() => toast.error("운동 목록을 불러올 수 없습니다."));
  }, [open]);

  const filtered = exercises.filter(
    (e) => e.type === tab && !excludeIds.includes(e.id)
  );

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customName.trim(), type: tab }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setExercises((prev) => [...prev, data.exercise]);
      setCustomName("");
      toast.success("운동이 추가되었습니다.");
    } catch {
      toast.error("운동 추가에 실패했습니다.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] rounded-none">
        <SheetHeader>
          <SheetTitle>운동 선택</SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="w-full">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="flex-1">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(TYPE_LABELS).map((type) => (
            <TabsContent key={type} value={type} className="mt-2">
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {filtered.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-center justify-between"
                    onClick={() => onSelect(exercise)}
                  >
                    <span className="text-sm">{exercise.name}</span>
                    {!exercise.isSystem && (
                      <span className="text-xs text-muted-foreground">
                        커스텀
                      </span>
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {excludeIds.length > 0
                      ? "추가할 수 있는 운동이 없습니다."
                      : "운동이 없습니다."}
                  </p>
                )}
              </div>

              {/* Custom exercise input */}
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Input
                  placeholder="커스텀 운동 추가"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddCustom}
                  disabled={adding || !customName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
