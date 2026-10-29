import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { taskTypeColor } from "@/components/tasks/TaskTypeIcon";
import { todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const WEEKDAY_HEADERS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

interface TaskCalendarProps {
  tasks: Task[];
}

// A compact month overview (EduPage-style) - not interactive beyond paging months.
// Each day shows up to three small dots colored by task/exam type, so density of
// upcoming work is visible at a glance without opening the list.
export function TaskCalendar({ tasks }: TaskCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const today = todayISO();

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDate = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueDate || task.completed) continue;
    const list = byDate.get(task.dueDate) || [];
    list.push(task);
    byDate.set(task.dueDate, list);
  }

  return (
    <div className="border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{format(month, "MMMM yyyy")}</p>
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {WEEKDAY_HEADERS.map((d) => (
          <span key={d} className="text-[10px] font-semibold text-muted-foreground">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const items = byDate.get(iso) || [];
          const isToday = iso === today;
          return (
            <div key={iso} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  isToday ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/40"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex h-1.5 gap-0.5">
                {items.slice(0, 3).map((task) => (
                  <span key={task.id} className="size-1.5 rounded-full" style={{ backgroundColor: taskTypeColor(task) }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
