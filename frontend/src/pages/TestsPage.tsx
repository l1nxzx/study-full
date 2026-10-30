import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import * as testsApi from "@/api/tests";
import { Page, PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, InlineError } from "@/components/shared/EmptyState";
import { SubjectLabel } from "@/components/shared/SubjectSwatch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubjects } from "@/hooks/useSubjects";
import { describeSettings, testTitle } from "@/lib/testLabels";
import { cn } from "@/lib/utils";

function ScoreText({ percent }: { percent: number }) {
  return <span className={cn("tabular", percent >= 85 ? "text-ok" : percent >= 50 ? "text-fg" : "text-bad")}>{Math.round(percent)}%</span>;
}

export function TestsPage() {
  const { data: tests, isLoading, isError } = useQuery({
    queryKey: ["tests"],
    queryFn: testsApi.listTests,
    // Tests being written fill in on their own.
    refetchInterval: (q) => (q.state.data?.some((t) => t.status === "generating") ? 4000 : false),
  });
  const { data: subjects } = useSubjects();
  const subjectById = new Map((subjects || []).map((s) => [s.id, s]));

  const graded = (tests || []).filter((t) => t.gradedCount > 0);
  const average = graded.length ? graded.reduce((s, t) => s + (t.lastPercent ?? 0), 0) / graded.length : null;

  const newTest = (
    <Button asChild>
      <Link to="/tests/new">
        <Plus /> New test
      </Link>
    </Button>
  );

  return (
    <Page>
      <PageHeader
        title="Tests"
        description={
          graded.length > 0 && average !== null
            ? `${graded.length} ${graded.length === 1 ? "test" : "tests"} graded · ${Math.round(average)}% average on the latest tries`
            : "Long written tests from your notes, graded by the AI."
        }
        actions={newTest}
      />

      {isLoading && (
        <div className="divide-y divide-rule">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="py-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-2.5 h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {isError && <InlineError>Couldn't load your tests.</InlineError>}

      {tests?.length === 0 && (
        <EmptyState
          title="No tests yet"
          description="Pick notes, choose how hard and how long the test should be, and answer every question in writing. When you hand it in, the AI grades each answer with points and tells you what to learn."
          action={newTest}
        />
      )}

      {tests && tests.length > 0 && (
        <ul className="divide-y divide-rule border-t border-rule">
          {tests.map((t) => {
            const subject = t.subjectId ? subjectById.get(t.subjectId) : undefined;
            return (
              <li key={t.id}>
                <Link to={`/tests/${t.id}`} className="group flex gap-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-[1.0625rem] font-medium text-fg transition-colors group-hover:text-accent">{testTitle(t)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-fg-muted">
                      {subject && <SubjectLabel name={subject.name} color={subject.color} />}
                      {subject && <span aria-hidden>·</span>}
                      <span>
                        {t.status === "ready"
                          ? `${t.questionCount} questions · ${t.totalPoints} points · ~${t.estimatedMinutes} min`
                          : `${t.plannedQuestionCount} questions · ~${t.estimatedMinutes} min`}
                      </span>
                    </p>
                    <p className="mt-0.5 text-meta text-fg-faint">{describeSettings(t.settings)}</p>
                  </div>
                  <div className="shrink-0 text-right text-[0.8125rem]">
                    {t.status === "generating" ? (
                      <span className="text-accent">Being written</span>
                    ) : t.status === "failed" ? (
                      <span className="text-bad">Couldn't be written</span>
                    ) : t.openAttemptId ? (
                      <span className="text-accent">In progress</span>
                    ) : t.lastPercent !== null ? (
                      <span className="text-fg-muted">
                        Last <ScoreText percent={t.lastPercent} />
                        {t.gradedCount > 1 && t.bestPercent !== null && (
                          <span className="block text-meta text-fg-faint">best {Math.round(t.bestPercent)}%</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-fg-faint">Not taken</span>
                    )}
                    <span className="mt-0.5 block text-meta text-fg-faint">{formatDistanceToNow(parseISO(t.lastActivityAt), { addSuffix: true })}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
