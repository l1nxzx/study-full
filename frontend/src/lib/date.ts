import { addDays, format, formatDistanceToNow, parseISO } from "date-fns";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function todayWeekday(): number {
  return new Date().getDay();
}

export function formatDateLong(dateStr: string): string {
  return format(parseISO(dateStr), "MMMM d, yyyy");
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d");
}

export function formatWeekdayAbbrev(dateStr: string): string {
  return format(parseISO(dateStr), "EEE").toUpperCase();
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function minutesSinceMidnight(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayISO();
}

export function addDaysISO(dateStr: string, amount: number): string {
  return format(addDays(parseISO(dateStr), amount), "yyyy-MM-dd");
}

export function weekdayOf(dateStr: string): number {
  return parseISO(dateStr).getDay();
}

export function mondayOfWeek(dateStr: string): string {
  const day = weekdayOf(dateStr);
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysISO(dateStr, diff);
}

export function formatDateWithWeekday(dateStr: string): string {
  return format(parseISO(dateStr), "EEEE, MMMM d");
}

// "TODAY" / "TOMORROW" / "YESTERDAY" relative to the real current date, else the plain
// weekday+date - used to label the day-view sections the same way whether you're
// looking at today or paging through other days.
export function describeDayRelativeToToday(dateStr: string): string {
  const today = todayISO();
  if (dateStr === today) return "TODAY";
  if (dateStr === addDaysISO(today, 1)) return "TOMORROW";
  if (dateStr === addDaysISO(today, -1)) return "YESTERDAY";
  return format(parseISO(dateStr), "EEEE").toUpperCase();
}

export function relativeSyncTime(isoTimestamp: string): string {
  return formatDistanceToNow(parseISO(isoTimestamp), { addSuffix: true });
}

export function relativeCountdown(time: string): string {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const diff = minutesSinceMidnight(time) - nowMinutes;

  if (diff <= 0) return "In progress";
  if (diff < 60) return `In ${diff} min`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins === 0 ? `In ${hours}h` : `In ${hours}h ${mins}m`;
}
