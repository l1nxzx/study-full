// Usage over time, worked out on the device from the days with study time (one record per day,
// sent by the server). Dates are local calendar dates (YYYY-MM-DD); weeks start on Monday.

export interface DayTotal {
  date: string;
  seconds: number;
}

const DAY_MS = 86_400_000;
const DAYS_PER_MONTH = 365.25 / 12;

export const parseDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
export const toDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const addDays = (iso: string, n: number) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toDate(d);
};
/** Calendar days from `from` to `to`, both included. */
export const dayCount = (from: string, to: string) =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS) + 1;
const mondayOf = (iso: string) => addDays(iso, -((parseDate(iso).getDay() + 6) % 7));
const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
const monthEnd = (iso: string) => {
  const d = parseDate(monthStart(iso));
  return toDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
const monthBefore = (iso: string) => addDays(monthStart(iso), -1);
/** The same day of an earlier month (its last day when that month is shorter). */
const sameDayIn = (month: string, day: string) => {
  const last = Number(monthEnd(month).slice(8));
  return `${month.slice(0, 8)}${String(Math.min(Number(day.slice(8)), last)).padStart(2, "0")}`;
};

export type PeriodKey = "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "last7" | "last30" | "all";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export interface PeriodRange {
  /** Inclusive; null for all time (then from the first recorded day). */
  from: string | null;
  to: string;
  /** The equally long earlier period, when a comparison is fair. */
  previous: { from: string; to: string; label: string } | null;
}

export function periodRange(key: PeriodKey, today: string): PeriodRange {
  const yesterday = addDays(today, -1);
  switch (key) {
    case "today":
      return { from: today, to: today, previous: null };
    case "yesterday":
      return { from: yesterday, to: yesterday, previous: { from: addDays(today, -2), to: addDays(today, -2), label: "the day before" } };
    case "thisWeek": {
      const mon = mondayOf(today);
      return { from: mon, to: today, previous: { from: addDays(mon, -7), to: addDays(today, -7), label: "the same days last week" } };
    }
    case "lastWeek": {
      const mon = addDays(mondayOf(today), -7);
      return { from: mon, to: addDays(mon, 6), previous: { from: addDays(mon, -7), to: addDays(mon, -1), label: "the week before" } };
    }
    case "thisMonth": {
      const prev = monthBefore(today);
      return { from: monthStart(today), to: today, previous: { from: monthStart(prev), to: sameDayIn(monthStart(prev), today), label: "the same days last month" } };
    }
    case "lastMonth": {
      const last = monthBefore(today);
      const before = monthBefore(last);
      return { from: monthStart(last), to: monthEnd(last), previous: { from: monthStart(before), to: monthEnd(before), label: "the month before" } };
    }
    case "last7":
      return { from: addDays(today, -6), to: today, previous: { from: addDays(today, -13), to: addDays(today, -7), label: "the 7 days before" } };
    case "last30":
      return { from: addDays(today, -29), to: today, previous: { from: addDays(today, -59), to: addDays(today, -30), label: "the 30 days before" } };
    case "all":
      return { from: null, to: today, previous: null };
  }
}

export function sumBetween(days: DayTotal[], from: string, to: string) {
  let seconds = 0;
  let activeDays = 0;
  let busiest: DayTotal | null = null;
  for (const d of days) {
    if (d.date < from || d.date > to || d.seconds <= 0) continue;
    seconds += d.seconds;
    activeDays += 1;
    if (!busiest || d.seconds > busiest.seconds) busiest = d;
  }
  return { seconds, activeDays, busiest };
}

/** "+12%", "−40%", "new", "same", or null when there is nothing to compare. */
export function changeLabel(now: number, before: number): string | null {
  if (before <= 0) return now > 0 ? "new" : null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return "same";
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

/** Every day from `from` to `to`, with its time (0 when none). */
export function dailySeries(days: DayTotal[], from: string, to: string): DayTotal[] {
  const byDate = new Map(days.map((d) => [d.date, d.seconds]));
  return Array.from({ length: dayCount(from, to) }, (_, i) => {
    const date = addDays(from, i);
    return { date, seconds: byDate.get(date) ?? 0 };
  });
}

export interface MonthRow {
  month: string; // YYYY-MM
  seconds: number;
  activeDays: number;
  /** Average per week within the month (only the days since the first recorded day). */
  perWeekSeconds: number;
}

/** The last `count` calendar months, oldest first, that have started since the first recorded day. */
export function monthRows(days: DayTotal[], first: string | null, today: string, count: number): MonthRow[] {
  if (!first) return [];
  const rows: MonthRow[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const anchor = addDays(monthStart(today), 0);
    const d = parseDate(anchor);
    d.setMonth(d.getMonth() - i);
    const ref = toDate(d);
    const from = monthStart(ref) < first ? first : monthStart(ref);
    const to = monthEnd(ref) > today ? today : monthEnd(ref);
    if (from > to) continue;
    const { seconds, activeDays } = sumBetween(days, from, to);
    const weeks = dayCount(from, to) / 7;
    rows.push({ month: ref.slice(0, 7), seconds, activeDays, perWeekSeconds: seconds / weeks });
  }
  return rows;
}

export interface Averages {
  /** Per calendar day over the last 30 days (fewer if the study history is shorter). */
  perDaySeconds: number;
  perWeekSeconds: number;
  perMonthSeconds: number;
  /** Calendar days since the first recorded day. */
  spanDays: number;
}

export function averages(days: DayTotal[], first: string | null, today: string): Averages {
  if (!first) return { perDaySeconds: 0, perWeekSeconds: 0, perMonthSeconds: 0, spanDays: 0 };
  const spanDays = dayCount(first, today);
  const window = Math.min(30, spanDays);
  const recent = sumBetween(days, addDays(today, -(window - 1)), today).seconds;
  const total = sumBetween(days, first, today).seconds;
  return {
    perDaySeconds: recent / window,
    perWeekSeconds: total / (spanDays / 7),
    perMonthSeconds: total / (spanDays / DAYS_PER_MONTH),
    spanDays,
  };
}

/** Average time per weekday (Sunday = 0), over every such weekday since the first recorded day. */
export function weekdayAverages(days: DayTotal[], first: string | null, today: string): number[] {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  if (!first) return totals;
  for (let date = first; date <= today; date = addDays(date, 1)) counts[parseDate(date).getDay()]! += 1;
  for (const d of days) totals[parseDate(d.date).getDay()]! += d.seconds;
  return totals.map((t, w) => (counts[w] ? t / counts[w]! : 0));
}

export interface Streaks {
  current: number;
  longest: number;
}

/** Days in a row with study time: the current run (ending today, or yesterday if today has none yet) and the longest ever. */
export function streaks(days: DayTotal[], today: string): Streaks {
  const active = new Set(days.filter((d) => d.seconds > 0).map((d) => d.date));
  let current = 0;
  for (let date = active.has(today) ? today : addDays(today, -1); active.has(date); date = addDays(date, -1)) current += 1;
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of [...active].sort()) {
    run = prev && addDays(prev, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  }
  return { current, longest };
}
