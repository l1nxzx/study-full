import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import * as statsApi from "@/api/stats";
import { Page, PageHeader, Section } from "@/components/layout/PageHeader";
import { EmptyState, InlineError } from "@/components/shared/EmptyState";
import { BarChart, Figure, FigureRow, RankBars } from "@/components/stats/Charts";
import { AREA_LABELS, formatShort, formatStudyTime } from "@/components/stats/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { todayISO } from "@/lib/date";
import { FRESHNESS } from "@/lib/freshness";
import { overviewWithStudy, useStudyOverlay } from "@/lib/statsOverlay";
import {
  PERIODS,
  averages,
  changeLabel,
  dailySeries,
  dayCount,
  MONTH_AVERAGE_AFTER_DAYS,
  WEEK_AVERAGE_AFTER_DAYS,
  monthRows,
  periodRange,
  streaks,
  sumBetween,
  weekdayAverages,
  type PeriodKey,
} from "@/lib/usage";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Monday first, as the week is read.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function SessionRow({ session }: { session: statsApi.SessionView }) {
  const start = parseISO(session.startedAt);
  const end = parseISO(session.lastActiveAt);
  return (
    <li className="flex gap-4 py-3">
      <div className="w-28 shrink-0 text-[0.8125rem]">
        <p className="text-fg">{format(start, "EEE, MMM d")}</p>
        <p className="text-meta text-fg-faint tabular">
          {format(start, "HH:mm")}–{format(end, "HH:mm")}
        </p>
      </div>
      <div className="min-w-0 flex-1 text-[0.8125rem]">
        <p className="text-fg">
          {formatStudyTime(session.seconds)}
          <span className="text-fg-muted"> · mostly {AREA_LABELS[session.mainArea]?.toLowerCase() ?? "studying"}</span>
        </p>
        {session.notes.length > 0 && (
          <p className="mt-0.5 truncate text-meta text-fg-faint">
            {session.notes.map((n, i) => (
              <span key={n.noteId}>
                {i > 0 && ", "}
                <Link to={`/notes/${n.noteId}`} className="hover:text-accent">
                  {n.title}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const { data: fetched, isLoading, isError } = useQuery({ queryKey: ["stats", "overview"], queryFn: statsApi.getOverview, staleTime: FRESHNESS.stats, refetchInterval: FRESHNESS.stats });
  // This device's study time that the server's answer doesn't include yet is added on top.
  const overlay = useStudyOverlay(fetched?.asOf);
  const data = fetched && overlay ? overviewWithStudy(fetched, overlay) : fetched;
  const today = todayISO();
  const [periodKey, setPeriodKey] = useState<PeriodKey>("thisWeek");

  const name = user?.name || user?.email?.split("@")[0] || "You";
  const days = data?.time.allDays ?? [];
  const first = data?.time.firstDate ?? null;
  const hasStudy = !!data && data.time.totalSeconds > 0;

  // Usage over time, for the chosen period.
  const range = periodRange(periodKey, today);
  const from = range.from ?? first ?? today;
  const current = sumBetween(days, from, range.to);
  const previous = range.previous ? sumBetween(days, range.previous.from, range.previous.to) : null;
  const periodDays = dayCount(from, range.to);
  const perDay = current.seconds / periodDays;
  const usageBars =
    periodKey === "all"
      ? monthRows(days, first, today, 24).map((row) => ({
          key: row.month,
          label: row.month.slice(5) === "01" ? row.month.slice(0, 4) : row.month.slice(5),
          title: `${format(parseISO(`${row.month}-01`), "MMMM yyyy")} · ${row.activeDays} active days`,
          value: row.seconds,
          valueLabel: formatStudyTime(row.seconds),
          highlight: row.month === today.slice(0, 7),
        }))
      : dailySeries(days, first && first > from ? first : from, range.to).map((d) => ({
          key: d.date,
          label: d.date.slice(8),
          title: `${format(parseISO(d.date), "EEEE, MMMM d")}${d.seconds ? "" : " · no study"}`,
          value: d.seconds,
          valueLabel: formatStudyTime(d.seconds),
          highlight: d.date === today,
        }));

  // Averages over the whole history.
  const avg = averages(days, first, today);
  const monthlyAverages = monthRows(days, first, today, 12);
  const weekdays = weekdayAverages(days, first, today);
  const span = Math.max(1, avg.spanDays);
  const streak = streaks(days, today);

  return (
    <Page width="wide">
      <PageHeader
        title={name}
        description={
          data?.time.firstDate
            ? `Studying with Study since ${format(parseISO(data.time.firstDate), "MMMM d, yyyy")} · ${data.time.activeDays} active ${data.time.activeDays === 1 ? "day" : "days"}`
            : user?.email
        }
      />

      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6 @2xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      )}
      {isError && <InlineError>Couldn't load your statistics.</InlineError>}

      {data && !hasStudy && (
        <EmptyState
          title="Nothing to show yet"
          description="Study time is counted while you read notes, use the assistant, take quizzes and tests. Come back after a session and it will be here."
        />
      )}

      {data && hasStudy && (
        <div className="space-y-14">
          <FigureRow>
            <Figure label="All time" value={formatStudyTime(data.time.totalSeconds)} detail={`${data.sessions.count} ${data.sessions.count === 1 ? "session" : "sessions"}`} />
            <Figure label="Notes" value={data.counts.notes} detail={`${data.counts.subjects} ${data.counts.subjects === 1 ? "subject" : "subjects"}`} />
            <Figure label="Streak" value={`${streak.current} ${streak.current === 1 ? "day" : "days"}`} detail={`Longest ${streak.longest} ${streak.longest === 1 ? "day" : "days"}`} />
            <Figure label="Daily average" value={formatStudyTime(avg.perDaySeconds)} detail="Last 30 days" />
          </FigureRow>

          <Section title="Usage over time" description="How much you studied in each period.">
            <div className="flex flex-wrap gap-1.5 pb-5 pt-5">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={periodKey === p.key}
                  onClick={() => setPeriodKey(p.key)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[0.8125rem] transition-colors",
                    periodKey === p.key ? "border-accent bg-tint text-fg" : "border-rule text-fg-muted hover:border-rule-strong hover:text-fg"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <FigureRow>
              <Figure
                label={PERIODS.find((p) => p.key === periodKey)?.label ?? ""}
                value={formatStudyTime(current.seconds)}
                detail={
                  previous && range.previous && changeLabel(current.seconds, previous.seconds)
                    ? `${changeLabel(current.seconds, previous.seconds)} against ${range.previous.label}`
                    : undefined
                }
              />
              <Figure label="Active days" value={`${current.activeDays} of ${periodDays}`} />
              <Figure label="Average per day" value={formatStudyTime(perDay)} />
              <Figure
                label="Busiest day"
                value={current.busiest ? format(parseISO(current.busiest.date), "EEE, MMM d") : "–"}
                detail={current.busiest ? formatStudyTime(current.busiest.seconds) : undefined}
              />
            </FigureRow>
            <div className="pt-5">
              <BarChart
                height={96}
                data={usageBars}
                labelEvery={usageBars.length > 14 ? Math.ceil(usageBars.length / 8) : 1}
                emptyLabel="Nothing studied in this period."
              />
            </div>
          </Section>

          <Section title="Averages" description="Over your whole history, not just the total.">
            <FigureRow>
              <Figure label="Per day" value={formatStudyTime(avg.perDaySeconds)} detail="Last 30 days" />
              <Figure
                label="Per week"
                value={avg.perWeekSeconds === null ? "–" : formatStudyTime(avg.perWeekSeconds)}
                detail={avg.perWeekSeconds === null ? `Shown after ${WEEK_AVERAGE_AFTER_DAYS} days of history` : "Since you started"}
              />
              <Figure
                label="Per month"
                value={avg.perMonthSeconds === null ? "–" : formatStudyTime(avg.perMonthSeconds)}
                detail={avg.perMonthSeconds === null ? `Shown after ${MONTH_AVERAGE_AFTER_DAYS} days of history` : "Since you started"}
              />
            </FigureRow>
            <div className="pt-5">
              <p className="pb-1 text-[0.8125rem] text-fg-muted">Average per week, month by month</p>
              <BarChart
                height={96}
                data={monthlyAverages.map((row) => ({
                  key: row.month,
                  label: format(parseISO(`${row.month}-01`), "MMM"),
                  title: `${format(parseISO(`${row.month}-01`), "MMMM yyyy")} · ${formatStudyTime(row.seconds)} in total, ${row.activeDays} active days`,
                  value: row.perWeekSeconds ?? 0,
                  valueLabel: row.perWeekSeconds === null ? "too early" : formatStudyTime(row.perWeekSeconds),
                  highlight: row.month === today.slice(0, 7),
                }))}
                emptyLabel="Not enough history yet."
              />
            </div>
          </Section>

          <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-2">
            <Section title="Time of day" description="Average per day, by the hour a session starts.">
              <BarChart
                className="pt-3"
                height={88}
                data={data.time.byHour.map((seconds, hour) => ({
                  key: String(hour),
                  label: String(hour),
                  title: `${String(hour).padStart(2, "0")}:00–${String(hour).padStart(2, "0")}:59 · ${formatStudyTime(seconds / span)} a day on average`,
                  value: seconds / span,
                  valueLabel: formatStudyTime(seconds / span),
                }))}
                labelEvery={3}
              />
            </Section>
            <Section title="Day of the week" description="Average per weekday, over every such day.">
              <BarChart
                className="pt-3"
                height={88}
                data={WEEK_ORDER.map((d) => ({
                  key: String(d),
                  label: WEEKDAYS[d]!,
                  title: `${WEEKDAYS[d]}days · ${formatStudyTime(weekdays[d]!)} on average`,
                  value: weekdays[d]!,
                  valueLabel: formatStudyTime(weekdays[d]!),
                }))}
              />
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-2">
            <Section title="Totals by hour" description="All study time, by the hour a session starts.">
              <BarChart
                className="pt-3"
                height={88}
                data={data.time.byHour.map((seconds, hour) => ({
                  key: String(hour),
                  label: String(hour),
                  title: `${String(hour).padStart(2, "0")}:00–${String(hour).padStart(2, "0")}:59 · ${formatStudyTime(seconds)} in total`,
                  value: seconds,
                  valueLabel: formatStudyTime(seconds),
                }))}
                labelEvery={3}
              />
            </Section>
            <Section title="Totals by weekday" description="All study time, by weekday.">
              <BarChart
                className="pt-3"
                height={88}
                data={WEEK_ORDER.map((d) => ({
                  key: String(d),
                  label: WEEKDAYS[d]!,
                  title: `${WEEKDAYS[d]}days · ${formatStudyTime(data.time.byWeekday[d]!)} in total`,
                  value: data.time.byWeekday[d]!,
                  valueLabel: formatStudyTime(data.time.byWeekday[d]!),
                }))}
              />
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-2">
            <Section title="By subject">
              <RankBars
                data={data.time.bySubject.map((s) => ({
                  key: s.subjectId,
                  label: (
                    <Link to={`/subjects/${s.subjectId}`} className="hover:text-accent">
                      {s.name}
                    </Link>
                  ),
                  value: s.seconds,
                  valueLabel: formatStudyTime(s.seconds),
                  color: s.color,
                }))}
              />
            </Section>
            <Section title="By activity">
              <RankBars
                data={Object.entries(data.time.byArea)
                  .filter(([, v]) => (v ?? 0) > 0)
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                  .map(([area, seconds]) => ({
                    key: area,
                    label: AREA_LABELS[area] ?? area,
                    value: seconds ?? 0,
                    valueLabel: formatStudyTime(seconds ?? 0),
                  }))}
              />
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Section
              title="Recent sessions"
              description={
                data.sessions.count > 0
                  ? `Average ${formatStudyTime(data.sessions.averageSeconds)} · longest ${formatStudyTime(data.sessions.longestSeconds)}`
                  : undefined
              }
            >
              {data.sessions.recent.length === 0 ? (
                <p className="py-3 text-sm text-fg-faint">No sessions yet.</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {data.sessions.recent.map((s) => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Most studied notes">
              {data.time.topNotes.length === 0 ? (
                <p className="py-3 text-sm text-fg-faint">No notes studied yet.</p>
              ) : (
                <ol className="divide-y divide-rule">
                  {data.time.topNotes.map((n) => (
                    <li key={n.noteId}>
                      <Link to={`/notes/${n.noteId}`} className="group flex items-baseline justify-between gap-3 py-2.5">
                        <span className="truncate font-serif text-[0.9375rem] text-fg group-hover:text-accent">{n.title}</span>
                        <span className="shrink-0 text-meta text-fg-muted tabular">{formatShort(n.seconds)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>

          <Section title="Assistant">
            <p className="py-4 text-sm text-fg-muted">
              <span className="text-fg tabular">{data.assistant.questionsAsked}</span> questions asked in{" "}
              <span className="text-fg tabular">{data.assistant.conversations}</span> saved conversations.
            </p>
          </Section>
        </div>
      )}
    </Page>
  );
}
