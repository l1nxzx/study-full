import { Link } from "react-router-dom";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { formatDayShort, formatTimeRange, relativeCountdown, todayISO } from "@/lib/date";
import type { ScheduleOccurrence } from "@/lib/scheduleOccurrence";

interface NextClassCardProps {
  occurrence?: ScheduleOccurrence;
}

export function NextClassCard({ occurrence }: NextClassCardProps) {
  const isToday = occurrence?.date === todayISO();

  const content = !occurrence ? (
    <p className="text-sm text-fg-faint">Nothing scheduled soon.</p>
  ) : (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg transition-colors group-hover:text-accent">
        <SubjectSwatch color={occurrence.color} />
        <span className="truncate">{occurrence.title}</span>
      </p>
      <p className="mt-1 pl-4 text-[0.8125rem] text-fg-muted">
        {isToday ? "Today" : formatDayShort(occurrence.date)}, {formatTimeRange(occurrence.startTime, occurrence.endTime)}
        {occurrence.room ? ` · Room ${occurrence.room}` : ""}
      </p>
      {isToday && <p className="mt-1 pl-4 text-[0.8125rem] font-medium text-accent">{relativeCountdown(occurrence.startTime)}</p>}
    </div>
  );

  return (
    <section>
      <h2 className="group-label mb-2">Next class</h2>
      {occurrence?.subjectId ? (
        <Link to={`/subjects/${occurrence.subjectId}`} className="group block">
          {content}
        </Link>
      ) : (
        content
      )}
    </section>
  );
}
