"use client";

import { useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekSession {
  date: string;
  status: string;
}

interface WeeklyCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  workoutDates: string[];
  weekSessions?: WeekSession[];
}

export function WeeklyCalendar({
  selectedDate,
  onSelectDate,
  workoutDates,
  weekSessions = [],
}: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = addWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthLabel = format(weekStart, "yyyy년 M월", { locale: ko });

  const hasWorkout = (date: Date) =>
    workoutDates.some((d) => isSameDay(new Date(d), date));

  const getSessionStatus = (date: Date) =>
    weekSessions.find((s) => isSameDay(new Date(s.date), date))?.status;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{monthLabel}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setWeekOffset((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setWeekOffset(0)}
          >
            <span className="text-xs">오늘</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setWeekOffset((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const workout = hasWorkout(day);
          const status = getSessionStatus(day);
          const isPlanned = status === "PLANNED";

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "flex flex-col items-center py-1.5 px-1 transition-colors relative",
                selected && "bg-primary text-primary-foreground",
                !selected && today && "bg-muted",
                !selected && !today && "hover:bg-muted/50"
              )}
            >
              <span className="text-[10px] text-inherit opacity-70">
                {format(day, "EEE", { locale: ko })}
              </span>
              <span className={cn("text-sm font-medium", selected && "text-primary-foreground")}>
                {format(day, "d")}
              </span>
              {workout && (
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mt-0.5",
                    isPlanned
                      ? selected
                        ? "border border-primary-foreground bg-transparent"
                        : "border border-amber-500 bg-transparent"
                      : selected
                        ? "bg-primary-foreground"
                        : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
