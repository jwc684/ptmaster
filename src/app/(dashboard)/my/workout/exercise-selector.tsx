"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  type: string;
  category?: string | null;
  equipment?: string | null;
  isSystem: boolean;
}

interface ExerciseSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  excludeIds?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  하체: "하체",
  가슴: "가슴",
  등: "등",
  어깨: "어깨",
  팔: "팔",
  복근: "복근",
  유산소: "유산소",
  역도: "역도",
  기타: "기타",
};

const CATEGORY_ORDER = ["하체", "가슴", "등", "어깨", "팔", "복근", "유산소", "역도", "기타"];

export function ExerciseSelector({
  open,
  onClose,
  onSelect,
  excludeIds = [],
}: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tab, setTab] = useState("하체");
  const [searchQuery, setSearchQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    fetch("/api/exercises")
      .then((res) => res.json())
      .then((data) => {
        if (data.exercises) setExercises(data.exercises);
      })
      .catch(() => toast.error("운동 목록을 불러올 수 없습니다."));
  }, [open]);

  // Available categories from loaded exercises
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const e of exercises) {
      if (e.category) cats.add(e.category);
    }
    return CATEGORY_ORDER.filter((c) => cats.has(c));
  }, [exercises]);

  const filtered = useMemo(() => {
    let list = exercises.filter((e) => !excludeIds.includes(e.id));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    } else {
      list = list.filter((e) => e.category === tab);
    }
    return list;
  }, [exercises, excludeIds, tab, searchQuery]);

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    setAdding(true);
    try {
      const type = tab === "유산소" ? "CARDIO" : "WEIGHT";
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customName.trim(), type }),
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

  const isSearching = searchQuery.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-none">
        <SheetHeader>
          <SheetTitle>운동 선택</SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="운동 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {!isSearching && (
          <Tabs value={tab} onValueChange={setTab} className="mt-3">
            <TabsList className="w-full flex-wrap h-auto gap-0">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="flex-1 min-w-0 text-xs px-2">
                  {CATEGORY_LABELS[cat] || cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Exercise list */}
        <div className="space-y-0.5 max-h-[50vh] overflow-y-auto mt-2">
          {filtered.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-center justify-between"
              onClick={() => onSelect(exercise)}
            >
              <span className="text-sm">{exercise.name}</span>
              <div className="flex items-center gap-1.5">
                {exercise.equipment && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {exercise.equipment}
                  </Badge>
                )}
                {isSearching && exercise.category && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {exercise.category}
                  </Badge>
                )}
                {!exercise.isSystem && (
                  <span className="text-xs text-muted-foreground">커스텀</span>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isSearching
                ? "검색 결과가 없습니다."
                : excludeIds.length > 0
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
      </SheetContent>
    </Sheet>
  );
}
