import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { taskTypeColor } from "@/components/tasks/TaskTypeIcon";
import { todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const WEEKDAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const LEGEND = [
  { label: "Homework", task: { type: "homework", examKind: null } },
  { label: "Unit test", task: { type: "exam", examKind: "quiz" } },
  { label: "Big exam", task: { type: "exam", examKind: "major" } },
  { label: "Oral", task: { type: "exam", examKind: "oral" } },
] as const;

interface TaskCalendarProps {
  tasks: Task[];
}

// A compact month overview - not interactive beyond paging months.
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
    <div>
      <div className="flex min-h-9 items-end justify-between border-b border-rule pb-2">
        <p className="section-title">{format(month, "MMMM yyyy")}</p>
        <div className="-mr-1.5 flex">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="flex size-7 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-tint hover:text-fg"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="flex size-7 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-tint hover:text-fg"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_HEADERS.map((d) => (
          <span key={d} className="pb-1 text-meta text-fg-faint">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const items = byDate.get(iso) || [];
          const isToday = iso === today;
          return (
            <div
              key={iso}
              className="flex flex-col items-center gap-0.5 py-0.5"
              title={items.length > 0 ? items.map((t) => t.title).join(", ") : undefined}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-sm text-[0.8125rem] tabular",
                  isToday ? "bg-accent/15 font-semibold text-accent" : inMonth ? "text-fg" : "text-fg-faint/50"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex h-1.5 gap-[3px]">
                {items.slice(0, 3).map((task) => (
                  <span key={task.id} className="size-1.5 rounded-xs" style={{ backgroundColor: taskTypeColor(task) }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-rule pt-3 text-meta text-fg-muted">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-xs" style={{ backgroundColor: taskTypeColor(item.task) }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
