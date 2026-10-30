import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import * as testsApi from "@/api/tests";
import { Page, PageHeader, Section } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InlineError } from "@/components/shared/EmptyState";
import { SubjectLabel } from "@/components/shared/SubjectSwatch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubjects } from "@/hooks/useSubjects";
import { describeSettings, formatDuration, formatPoints } from "@/lib/testLabels";
import { cn } from "@/lib/utils";

function AttemptBars({ attempts }: { attempts: testsApi.TestAttemptSummary[] }) {
  const graded = attempts.filter((a) => a.status === "graded").reverse();
  if (graded.length < 2) return null;
  return (
    <div className="mt-6">
      <p className="mb-2 text-meta text-fg-faint">Score per try, oldest first</p>
      <div className="flex h-20 items-end gap-1.5" role="img" aria-label={`Scores: ${graded.map((a) => `${Math.round(a.percent ?? 0)}%`).join(", ")}`}>
        {graded.map((a) => (
          <div key={a.id} className="flex w-8 flex-col items-center gap-1">
            <span className="text-[0.6875rem] text-fg-faint tabular">{Math.round(a.percent ?? 0)}</span>
            <div className="w-full rounded-t-xs bg-accent/70" style={{ height: `${Math.max(4, ((a.percent ?? 0) / 100) * 56)}px` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: test, isLoading, isError } = useQuery({ queryKey: ["tests", id], queryFn: () => testsApi.getTest(id!), enabled: Boolean(id) });
  const { data: subjects } = useSubjects();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const start = useMutation({
    mutationFn: () => testsApi.startAttempt(id!),
    onSuccess: (attempt) => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      navigate(`/tests/attempts/${attempt.id}`);
    },
  });

  const regenerate = useMutation({
    mutationFn: () => testsApi.createTest({ noteIds: test!.noteIds, settings: test!.settings }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      navigate(`/tests/${created.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: () => testsApi.deleteTest(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      navigate("/tests");
    },
  });

  if (isLoading) {
    return (
      <Page>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="mt-3 h-3 w-1/3" />
        <Skeleton className="mt-10 h-10 w-40" />
      </Page>
    );
  }
  if (isError || !test) return <Navigate to="/tests" replace />;

  const subject = test.subjectId ? subjects?.find((s) => s.id === test.subjectId) : undefined;
  const open = test.attempts.find((a) => a.status !== "graded");
  const graded = test.attempts.filter((a) => a.status === "graded");
  const best = graded.length ? Math.max(...graded.map((a) => a.percent ?? 0)) : null;

  if (regenerate.isPending) {
    return (
      <Page width="reading">
        <PageHeader title="Writing a new test" description="Same notes and settings, new questions. This usually takes up to a minute." />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        back={{ to: "/tests", label: "Tests" }}
        title={<h1 className="material-title">{test.title}</h1>}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {subject && <SubjectLabel name={subject.name} color={subject.color} />}
            {subject && <span aria-hidden>·</span>}
            <span>
              {test.questionCount} questions · {test.totalPoints} points · about {test.estimatedMinutes} min
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-x-14 gap-y-12 @4xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-12">
          <section>
            <p className="text-sm text-fg-muted">{describeSettings(test.settings)}</p>
            {test.settings.instructions && <p className="mt-2 text-sm italic text-fg-faint">"{test.settings.instructions}"</p>}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {open ? (
                <Button size="lg" asChild>
                  <Link to={`/tests/attempts/${open.id}`}>
                    {open.status === "in_progress" ? `Continue (${open.answeredCount} of ${test.questionCount} answered)` : "See grading"}
                  </Link>
                </Button>
              ) : (
                <Button size="lg" onClick={() => start.mutate()} disabled={start.isPending}>
                  {start.isPending ? "Starting..." : graded.length > 0 ? "Take it again" : "Start the test"}
                </Button>
              )}
              <Button variant="ghost" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
                New test, same settings
              </Button>
            </div>
            {!open && graded.length === 0 && (
              <p className="mt-3 text-meta text-fg-faint">Your answers are saved as you write, so you can stop and come back.</p>
            )}
            <InlineError className="mt-3">
              {start.error ? getErrorMessage(start.error, "Couldn't start the test") : regenerate.error ? getErrorMessage(regenerate.error, "Couldn't create a new test") : null}
            </InlineError>
          </section>

          <Section title="Tries" description={graded.length > 0 ? `Best ${Math.round(best!)}% · ${graded.length} graded` : undefined}>
            {test.attempts.length === 0 ? (
              <p className="py-4 text-sm text-fg-faint">Not taken yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {test.attempts.map((a) => (
                  <li key={a.id}>
                    <Link to={`/tests/attempts/${a.id}`} className="group flex items-baseline justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="block text-sm text-fg group-hover:text-accent">{format(parseISO(a.startedAt), "EEE, MMM d, HH:mm")}</span>
                        <span className="block text-meta text-fg-faint">
                          {a.status === "graded"
                            ? `${formatDuration(a.elapsedSeconds)} · ${a.answeredCount} of ${test.questionCount} answered`
                            : a.status === "in_progress"
                              ? `In progress · ${a.answeredCount} of ${test.questionCount} answered`
                              : a.gradingError
                                ? "Handed in, grading failed - open to try again"
                                : "Being graded"}
                        </span>
                      </span>
                      {a.status === "graded" && a.percent !== null && (
                        <span className="shrink-0 text-right">
                          <span className={cn("block text-sm font-medium tabular", a.percent >= 85 ? "text-ok" : a.percent >= 50 ? "text-fg" : "text-bad")}>
                            {Math.round(a.percent)}%
                          </span>
                          <span className="block text-meta text-fg-faint tabular">
                            {formatPoints(a.awardedPoints ?? 0)} / {a.totalPoints} pts
                          </span>
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <AttemptBars attempts={test.attempts} />
          </Section>
        </div>

        <aside className="space-y-8">
          <section>
            <h2 className="group-label border-b border-rule pb-2">Covers</h2>
            <ul className="divide-y divide-rule">
              {test.noteIds.map((noteId, i) => (
                <li key={noteId}>
                  <Link to={`/notes/${noteId}`} className="block truncate py-2 font-serif text-[0.9375rem] text-fg hover:text-accent">
                    {test.noteTitles[i] ?? "Note"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="group-label border-b border-rule pb-2">Topics</h2>
            <p className="pt-2 text-[0.8125rem] leading-relaxed text-fg-muted">
              {[...new Set(test.questions.map((q) => q.topic).filter(Boolean))].join(", ") || "Not listed"}
            </p>
          </section>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 text-[0.8125rem] text-fg-faint transition-colors hover:text-bad"
          >
            <Trash2 className="size-3.5" /> Delete this test
          </button>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this test?"
        description="The test and all its tries and grades will be permanently deleted."
        confirmLabel="Delete test"
        isLoading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Page>
  );
}
