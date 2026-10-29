import { addDaysISO, todayISO } from "@/lib/date";
import type { Task } from "@/types";

function byDueDate(a: Task, b: Task): number {
  return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
}

export interface UpNextBuckets {
  overdue: Task[];
  tomorrow: Task[];
  today: Task[];
}

// Sorts open, dated tasks into the three groups the "Up Next" view shows, in the order
// they're prioritized: overdue (clear the backlog first), tomorrow (what actually needs
// prep right now), then today (last call) - deliberately not "today first", since
// schoolwork needs to be prepared the day before it's due, not the day of.
export function bucketUpNext(tasks: Task[]): UpNextBuckets {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const open = tasks.filter((t) => !t.completed && t.dueDate);

  return {
    overdue: open.filter((t) => t.dueDate! < today).sort(byDueDate),
    tomorrow: open.filter((t) => t.dueDate === tomorrow).sort(byDueDate),
    today: open.filter((t) => t.dueDate === today).sort(byDueDate),
  };
}

export interface TaskGroup {
  label: string;
  tasks: Task[];
  emphasis?: "overdue" | "tomorrow";
}

// The single chronological view the Tasks page shows: every open task/exam in one flow,
// oldest-overdue first through furthest-out, with "Tomorrow" called out (not boxed off
// into its own section) since that's the one day students actually need to prep for.
export function groupChronologically(tasks: Task[]): TaskGroup[] {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const weekEnd = addDaysISO(today, 7);
  const twoWeekEnd = addDaysISO(today, 14);

  const open = tasks.filter((t) => !t.completed);

  const groups: TaskGroup[] = [
    { label: "Overdue", tasks: open.filter((t) => t.dueDate && t.dueDate < today).sort(byDueDate), emphasis: "overdue" },
    { label: "Today", tasks: open.filter((t) => t.dueDate === today).sort(byDueDate) },
    { label: "Tomorrow", tasks: open.filter((t) => t.dueDate === tomorrow).sort(byDueDate), emphasis: "tomorrow" },
    { label: "This week", tasks: open.filter((t) => t.dueDate && t.dueDate > tomorrow && t.dueDate <= weekEnd).sort(byDueDate) },
    {
      label: "Next week",
      tasks: open.filter((t) => t.dueDate && t.dueDate > weekEnd && t.dueDate <= twoWeekEnd).sort(byDueDate),
    },
    { label: "Later", tasks: open.filter((t) => t.dueDate && t.dueDate > twoWeekEnd).sort(byDueDate) },
    { label: "No date", tasks: open.filter((t) => !t.dueDate) },
  ];

  return groups.filter((g) => g.tasks.length > 0);
}

// Open (incomplete) tasks/exams due on an exact date - used to surface what's due
// alongside a given day's classes in the Schedule views.
export function tasksDueOn(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => !t.completed && t.dueDate === date).sort(byDueDate);
}
