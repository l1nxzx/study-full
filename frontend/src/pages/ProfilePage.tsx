import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import * as statsApi from "@/api/stats";
import { Page, PageHeader, Section } from "@/components/layout/PageHeader";
import { EmptyState, InlineError } from "@/components/shared/EmptyState";
import { BarChart, Figure, FigureRow, RankBars } from "@/components/stats/Charts";
import { AREA_LABELS, formatShort, formatStudyTime } from "@/components/stats/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import { FRESHNESS } from "@/lib/freshness";
import { overviewWithStudy, useStudyOverlay } from "@/lib/statsOverlay";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function percent(n: number | null) {
  return n === null ? "–" : `${Math.round(n)}%`;
}

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

  const name = user?.name || user?.email?.split("@")[0] || "You";

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

      {data && data.time.totalSeconds === 0 && data.quizzes.completed === 0 && data.tests.graded === 0 && (
        <EmptyState
          title="Nothing to show yet"
          description="Study time is counted while you read notes, use the assistant, take quizzes and tests. Come back after a session and it will be here."
        />
      )}

      {data && (data.time.totalSeconds > 0 || data.quizzes.completed > 0 || data.tests.graded > 0) && (
        <div className="space-y-14">
          <FigureRow>
            <Figure label="Today" value={formatStudyTime(data.time.todaySeconds)} />
            <Figure label="Last 7 days" value={formatStudyTime(data.time.last7Seconds)} />
            <Figure label="Last 30 days" value={formatStudyTime(data.time.last30Seconds)} />
            <Figure label="All time" value={formatStudyTime(data.time.totalSeconds)} detail={`${data.sessions.count} ${data.sessions.count === 1 ? "session" : "sessions"}`} />
          </FigureRow>

          <Section title="Study time, last 30 days" description="Hover a bar for the day.">
            <BarChart
              className="pt-3"
              data={data.time.days.map((d) => ({
                key: d.date,
                label: d.date.slice(8),
                title: format(parseISO(d.date), "EEEE, MMMM d"),
                value: d.seconds,
                valueLabel: formatStudyTime(d.seconds),
                highlight: d.date === today,
              }))}
              labelEvery={5}
            />
          </Section>

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
            <Section title="Time of day" description="When your study sessions start.">
              <BarChart
                className="pt-3"
                height={88}
                data={data.time.byHour.map((seconds, hour) => ({
                  key: String(hour),
                  label: String(hour),
                  title: `${String(hour).padStart(2, "0")}:00–${String(hour).padStart(2, "0")}:59`,
                  value: seconds,
                  valueLabel: formatStudyTime(seconds),
                }))}
                labelEvery={3}
              />
            </Section>
            <Section title="Day of the week" description="All study time, by weekday.">
              <BarChart
                className="pt-3"
                height={88}
                data={[1, 2, 3, 4, 5, 6, 0].map((d) => ({
                  key: String(d),
                  label: WEEKDAYS[d],
                  title: `${WEEKDAYS[d]}days, all time`,
                  value: data.time.byWeekday[d],
                  valueLabel: formatStudyTime(data.time.byWeekday[d]),
                }))}
              />
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-2">
            <Section title="Quizzes">
              <div className="grid grid-cols-3 gap-4 py-4">
                <Figure label="Right" value={percent(data.quizzes.accuracy)} />
                <Figure label="Answered" value={data.quizzes.answered} />
                <Figure label="Quizzes" value={data.quizzes.completed} />
              </div>
              {data.quizzes.missed.length > 0 && (
                <>
                  <p className="group-label border-t border-rule pb-1 pt-4">Recently got wrong</p>
                  <ul className="divide-y divide-rule">
                    {data.quizzes.missed.map((m, i) => (
                      <li key={`${m.attemptId}-${i}`} className="py-2.5">
                        <p className="line-clamp-2 font-serif text-[0.9375rem] text-fg">{m.question.replace(/\$/g, "")}</p>
                        <Link to={`/notes/${m.noteId}`} className="text-meta text-fg-faint hover:text-accent">
                          {m.noteTitle}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            <Section title="Tests" action={<Link to="/tests" className="text-[0.8125rem] text-fg-muted hover:text-accent">All tests</Link>}>
              <div className="grid grid-cols-3 gap-4 py-4">
                <Figure label="Average" value={percent(data.tests.averagePercent)} />
                <Figure label="Best" value={percent(data.tests.bestPercent)} />
                <Figure label="Graded" value={data.tests.graded} />
              </div>
              {data.tests.recent.length > 0 && (
                <ul className="divide-y divide-rule border-t border-rule">
                  {data.tests.recent.map((t) => (
                    <li key={t.attemptId}>
                      <Link to={`/tests/attempts/${t.attemptId}`} className="group flex items-baseline justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-fg group-hover:text-accent">{t.title}</span>
                          <span className="block text-meta text-fg-faint">{format(parseISO(t.gradedAt), "MMM d")}</span>
                        </span>
                        <span className={cn("shrink-0 text-sm tabular", t.percent >= 85 ? "text-ok" : t.percent >= 50 ? "text-fg" : "text-bad")}>
                          {Math.round(t.percent)}%
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {data.tests.toReview.length > 0 && (
                <>
                  <p className="group-label border-t border-rule pb-1 pt-4">Topics that keep coming up to review</p>
                  <p className="text-[0.8125rem] leading-relaxed text-fg-muted">
                    {data.tests.toReview.map((t) => (t.count > 1 ? `${t.topic} (${t.count}×)` : t.topic)).join(", ")}
                  </p>
                </>
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
