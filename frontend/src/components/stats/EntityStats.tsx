import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import * as statsApi from "@/api/stats";
import { Section } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { todayISO } from "@/lib/date";
import { BarChart, Figure } from "./Charts";
import { formatShort, formatStudyTime } from "./format";
import { FRESHNESS } from "@/lib/freshness";

function last30(days: statsApi.DaySeconds[]) {
  const today = todayISO();
  return days.map((d) => ({
    key: d.date,
    label: "",
    title: format(parseISO(d.date), "EEEE, MMMM d"),
    value: d.seconds,
    valueLabel: formatStudyTime(d.seconds),
    highlight: d.date === today,
  }));
}

function pct(n: number | null) {
  return n === null ? "–" : `${Math.round(n)}%`;
}

/** "Your study of this note": time, sessions, quiz accuracy, tests and questions asked. */
export function NoteStatsSection({ noteId }: { noteId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["stats", "note", noteId], queryFn: () => statsApi.getNoteStats(noteId), staleTime: FRESHNESS.stats });

  return (
    <Section title="Your study of this note">
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-6 py-5 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 py-5 sm:grid-cols-4">
            <Figure
              label="Time spent"
              value={formatStudyTime(data.time.totalSeconds)}
              detail={data.time.lastStudied ? `last ${format(parseISO(data.time.lastStudied), "MMM d")}` : undefined}
            />
            <Figure label="Sessions" value={data.sessions} />
            <Figure
              label="Quizzes right"
              value={pct(data.quizzes.accuracy)}
              detail={data.quizzes.completed ? `${data.quizzes.correct} of ${data.quizzes.answered} · ${data.quizzes.completed} quizzes` : "no quizzes yet"}
            />
            <Figure
              label="Tests"
              value={data.tests.graded ? pct(data.tests.averagePercent) : "–"}
              detail={data.tests.count ? `${data.tests.graded} graded of ${data.tests.count}` : "none yet"}
            />
          </div>
          {data.time.totalSeconds > 0 && <BarChart data={last30(data.time.days)} height={56} emptyLabel="" />}
          <p className="mt-3 text-meta text-fg-faint">
            {data.assistant.questionsAsked} {data.assistant.questionsAsked === 1 ? "question" : "questions"} asked about this note
            {data.time.firstStudied ? ` · first studied ${format(parseISO(data.time.firstStudied), "MMMM d")}` : ""}
          </p>
          {data.quizzes.missed.length > 0 && (
            <div className="mt-6">
              <p className="group-label border-b border-rule pb-2">Quiz questions you got wrong</p>
              <ul className="divide-y divide-rule">
                {data.quizzes.missed.slice(0, 5).map((m, i) => (
                  <li key={`${m.attemptId}-${i}`} className="py-2.5 font-serif text-[0.9375rem] text-fg-muted">
                    {m.question.replace(/\$/g, "")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.tests.recent.length > 0 && (
            <div className="mt-6">
              <p className="group-label border-b border-rule pb-2">Tests with this note</p>
              <ul className="divide-y divide-rule">
                {data.tests.recent.slice(0, 5).map((t) => (
                  <li key={t.attemptId}>
                    <Link to={`/tests/attempts/${t.attemptId}`} className="group flex justify-between gap-3 py-2.5 text-sm">
                      <span className="truncate text-fg group-hover:text-accent">{t.title}</span>
                      <span className="shrink-0 text-fg-muted tabular">{Math.round(t.percent)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

/** Subject statistics for the subject page's side column. */
export function SubjectStatsSection({ subjectId }: { subjectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "subject", subjectId],
    queryFn: () => statsApi.getSubjectStats(subjectId),
    staleTime: FRESHNESS.stats,
  });

  return (
    <section>
      <h2 className="group-label border-b border-rule pb-2">Your study</h2>
      {isLoading || !data ? (
        <div className="space-y-3 py-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-4">
            <Figure label="Time spent" value={formatShort(data.time.totalSeconds)} detail={`${formatShort(data.time.last7Seconds)} this week`} />
            <Figure label="Sessions" value={data.sessions} />
            <Figure label="Quizzes right" value={pct(data.quizzes.accuracy)} detail={`${data.quizzes.completed} quizzes`} />
            <Figure label="Test average" value={pct(data.tests.averagePercent)} detail={`${data.tests.graded} graded`} />
          </div>
          {data.time.totalSeconds > 0 && <BarChart data={last30(data.time.days)} height={48} emptyLabel="" />}
          {data.time.topNotes.length > 0 && (
            <>
              <p className="mt-4 text-meta text-fg-faint">Most time on</p>
              <ul className="mt-1 space-y-1">
                {data.time.topNotes.slice(0, 4).map((n) => (
                  <li key={n.noteId} className="flex justify-between gap-3 text-[0.8125rem]">
                    <Link to={`/notes/${n.noteId}`} className="truncate text-fg hover:text-accent">
                      {n.title}
                    </Link>
                    <span className="shrink-0 text-fg-faint tabular">{formatShort(n.seconds)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {data.tests.toReview.length > 0 && (
            <p className="mt-4 text-meta leading-relaxed text-fg-faint">
              To review: <span className="text-fg-muted">{data.tests.toReview.map((t) => t.topic).join(", ")}</span>
            </p>
          )}
        </>
      )}
    </section>
  );
}
