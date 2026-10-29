import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort, formatTime, relativeCountdown, todayISO } from "@/lib/date";
import type { ScheduleOccurrence } from "@/lib/scheduleOccurrence";

interface NextClassCardProps {
  occurrence?: ScheduleOccurrence;
}

export function NextClassCard({ occurrence }: NextClassCardProps) {
  const isToday = occurrence?.date === todayISO();

  const content = !occurrence ? (
    <p className="text-sm text-muted-foreground">Nothing scheduled soon.</p>
  ) : (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 truncate text-base font-semibold text-foreground">
        {occurrence.title}
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: occurrence.color }} />
      </p>
      <p className="text-sm text-muted-foreground">
        {isToday ? "Today" : formatDateShort(occurrence.date)} · {formatTime(occurrence.startTime)}
        {occurrence.room ? ` · Room ${occurrence.room}` : ""}
      </p>
      {isToday && <p className="mt-1 text-xs font-medium text-primary">{relativeCountdown(occurrence.startTime)}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Class</CardTitle>
      </CardHeader>
      <CardContent>
        {occurrence?.subjectId ? (
          <Link to={`/subjects/${occurrence.subjectId}`} className="block transition-opacity hover:opacity-80">
            {content}
          </Link>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  );
}
