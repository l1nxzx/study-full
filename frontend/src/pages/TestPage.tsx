import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import * as testsApi from "@/api/tests";
import { Page, PageHeader, Section } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MoreMenu } from "@/components/shared/MoreMenu";
import { useRemoveAttempt } from "@/components/tests/useRemoveAttempt";
import { InlineError } from "@/components/shared/EmptyState";
import { SubjectLabel } from "@/components/shared/SubjectSwatch";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonLines } from "@/components/ui/skeleton";
import { useSubjects } from "@/hooks/useSubjects";
import { rememberWritingTest } from "@/hooks/useTestWritingWatcher";
import { describeSettings, formatDuration, formatPoints, testTitle } from "@/lib/testLabels";
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

function TryRow({ attempt: a, questionCount }: { attempt: testsApi.TestAttemptSummary; questionCount: number }) {
  const navigate = useNavigate();
  const remove = useRemoveAttempt(a);
  const to = `/tests/attempts/${a.id}`;
  return (
    <li className="flex items-center gap-2">
      <Link to={to} className="group flex min-w-0 flex-1 items-baseline justify-between gap-4 py-3">
        <span className="min-w-0">
          <span className="block text-sm text-fg group-hover:text-accent">{format(parseISO(a.startedAt), "EEE, MMM d, HH:mm")}</span>
          <span className="block text-meta text-fg-faint">
            {a.status === "graded"
              ? `${formatDuration(a.elapsedSeconds)} · ${a.answeredCount} of ${questionCount} answered`
              : a.status === "in_progress"
                ? `In progress · ${a.answeredCount} of ${questionCount} answered`
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
      <MoreMenu
        label="Actions for this try"
        items={[
          { label: a.status === "in_progress" ? "Continue" : a.status === "graded" ? "See results" : "Open", onSelect: () => navigate(to) },
          remove.available && { label: remove.label, onSelect: remove.ask, destructive: true },
        ]}
      />
      {remove.dialog}
    </li>
  );
}

export function TestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: test, isLoading, isError } = useQuery({
    queryKey: ["tests", id],
    queryFn: () => testsApi.getTest(id!),
    enabled: Boolean(id),
    // While the test is being written, check back until its questions are in.
    refetchInterval: (q) => (q.state.data?.status === "generating" ? 3000 : false),
  });
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
      rememberWritingTest(created.id);
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      navigate(`/tests/${created.id}`);
    },
  });

  const retry = useMutation({
    mutationFn: () => testsApi.retryTest(id!),
    onSuccess: (updated) => {
      rememberWritingTest(updated.id);
      queryClient.setQueryData(["tests", id], updated);
      queryClient.invalidateQueries({ queryKey: ["tests"], exact: true });
    },
  });

  const openAttempt = test?.attempts.find((a) => a.status === "in_progress");
  const cancelOpen = useRemoveAttempt(openAttempt);

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

  const deleteDialog = (
    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title="Delete this test?"
      description={
        test.status === "generating"
          ? "It stops being written and won't appear in your tests."
          : "The test and all its tries and grades will be permanently deleted."
      }
      confirmLabel="Delete test"
      onConfirm={() => remove.mutate()}
      isLoading={remove.isPending}
    />
  );

  if (test.status !== "ready") {
    const writing = test.status === "generating";
    return (
      <Page width="reading">
        <PageHeader
          back={{ to: "/tests", label: "Tests" }}
          title={writing ? "Writing your test" : "The test couldn't be written"}
          description={`${testTitle(test)} · ${test.plannedQuestionCount} questions · about ${test.estimatedMinutes} min`}
          menu={<MoreMenu items={[{ label: writing ? "Cancel and delete" : "Delete this test", onSelect: () => setConfirmDelete(true), destructive: true }]} />}
        />
        {writing ? (
          <div role="status">
            <p className="text-[0.9375rem] leading-relaxed text-fg">
              The AI is planning {test.plannedQuestionCount} questions across your notes and writing them with the answers it will grade against.
              {test.generationStartedAt && <> Started {formatDistanceToNow(parseISO(test.generationStartedAt), { addSuffix: true })};</>} it usually
              takes one to three minutes.
            </p>
            <p className="mt-2 text-sm text-fg-muted">
              You can leave this page. The test keeps being written, you'll be told when it's ready, and it waits in Tests.
            </p>
            <SkeletonLines lines={3} className="mt-10" />
            <SkeletonLines lines={4} className="mt-8" />
          </div>
        ) : (
          <div>
            <p className="text-[0.9375rem] leading-relaxed text-fg-muted">{test.generationError || "Something went wrong while writing it."}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => retry.mutate()} disabled={retry.isPending}>
                {retry.isPending ? "Starting..." : "Try again"}
              </Button>
            </div>
            <InlineError className="mt-3">{retry.error ? getErrorMessage(retry.error, "Couldn't start writing it again") : null}</InlineError>
          </div>
        )}
        {deleteDialog}
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
        menu={
          <MoreMenu
            items={[
              { label: "New test, same settings", onSelect: () => regenerate.mutate(), disabled: regenerate.isPending },
              open && { label: open.status === "in_progress" ? "Continue the open try" : "See grading", onSelect: () => navigate(`/tests/attempts/${open.id}`) },
              cancelOpen.available && { label: "Cancel the open try", onSelect: cancelOpen.ask, destructive: true },
              { label: "Delete this test", onSelect: () => setConfirmDelete(true), destructive: true },
            ]}
          />
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
                  <TryRow key={a.id} attempt={a} questionCount={test.questionCount} />
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
        </aside>
      </div>

      {deleteDialog}
      {cancelOpen.dialog}
    </Page>
  );
}
