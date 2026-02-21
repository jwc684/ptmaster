"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  type: string;
}

interface SetInputProps {
  exercise: Exercise;
  nextSetNumber: number;
  order: number;
  onAdd: (data: {
    exerciseId: string;
    setNumber: number;
    order: number;
    weight?: number;
    reps?: number;
    durationMinutes?: number;
  }) => void;
}

export function SetInput({ exercise, nextSetNumber, order, onAdd }: SetInputProps) {
  const [weight, setWeight] = useState("20");
  const [reps, setReps] = useState("10");
  const [duration, setDuration] = useState("30");

  const handleAdd = () => {
    const data: Parameters<typeof onAdd>[0] = {
      exerciseId: exercise.id,
      setNumber: nextSetNumber,
      order,
    };

    if (exercise.type === "WEIGHT") {
      const w = parseFloat(weight);
      const r = parseInt(reps);
      if (!w || !r) return;
      data.weight = w;
      data.reps = r;
    } else if (exercise.type === "CARDIO") {
      const d = parseInt(duration);
      if (!d) return;
      data.durationMinutes = d;
    } else {
      const r = parseInt(reps);
      if (!r) return;
      data.reps = r;
    }

    onAdd(data);
  };

  if (exercise.type === "WEIGHT") {
    return (
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground w-8">{nextSetNumber}</span>
        <Input
          type="number"
          inputMode="decimal"
          step="0.5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="h-8 w-20 text-sm"
          placeholder="kg"
        />
        <span className="text-xs text-muted-foreground">kg</span>
        <Input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="h-8 w-16 text-sm"
          placeholder="횟수"
        />
        <span className="text-xs text-muted-foreground">회</span>
        <Button size="sm" variant="outline" className="h-8" onClick={handleAdd}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (exercise.type === "CARDIO") {
    return (
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground w-8">{nextSetNumber}</span>
        <Input
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="h-8 w-20 text-sm"
          placeholder="분"
        />
        <span className="text-xs text-muted-foreground">분</span>
        <Button size="sm" variant="outline" className="h-8" onClick={handleAdd}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // BODYWEIGHT
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs text-muted-foreground w-8">{nextSetNumber}</span>
      <Input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="h-8 w-20 text-sm"
        placeholder="횟수"
      />
      <span className="text-xs text-muted-foreground">회</span>
      <Button size="sm" variant="outline" className="h-8" onClick={handleAdd}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
