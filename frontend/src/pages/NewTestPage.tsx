import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import * as testsApi from "@/api/tests";
import { Page, PageHeader, Section } from "@/components/layout/PageHeader";
import { InlineError } from "@/components/shared/EmptyState";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAiStatus } from "@/hooks/useAiStatus";
import { useNotes } from "@/hooks/useNotes";
import { useSubjects } from "@/hooks/useSubjects";
import { rememberWritingTest } from "@/hooks/useTestWritingWatcher";
import { formatDateShort } from "@/lib/date";
import { DIFFICULTY_LABELS, DURATIONS, LOGIC_LABELS, testTitle, THINKING_LABELS } from "@/lib/testLabels";
import { describePlan } from "@/lib/testPlan";

const MAX_NOTES = 15;

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 py-5 @2xl:grid-cols-[11rem_minmax(0,1fr)]">
      <p className="pt-1.5 text-sm font-medium text-fg">{label}</p>
      <div className="min-w-0">
        {children}
        {hint && <p className="mt-2 text-meta text-fg-faint">{hint}</p>}
      </div>
    </div>
  );
}

export function NewTestPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const aiEnabled = useAiStatus();
  const { data: notes, isLoading: notesLoading } = useNotes();
  const { data: subjects } = useSubjects();
  // Tests still being written (maybe started before leaving this page), so nobody starts a
  // second one thinking the first was lost.
  const { data: tests } = useQuery({
    queryKey: ["tests"],
    queryFn: testsApi.listTests,
    refetchInterval: (q) => (q.state.data?.some((t) => t.status === "generating") ? 4000 : false),
  });
  const writing = (tests || []).filter((t) => t.status === "generating");

  const initialIds = (params.get("noteIds") || "").split(",").filter(Boolean);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialIds));
  const [subjectFilter, setSubjectFilter] = useState<string>(params.get("subjectId") || "auto");
  const [query, setQuery] = useState("");

  const [difficulty, setDifficulty] = useState<testsApi.TestDifficulty>("medium");
  const [thinking, setThinking] = useState<testsApi.TestThinking>("understanding");
  const [logic, setLogic] = useState<testsApi.TestLogic>("medium");
  const [duration, setDuration] = useState<string>("45");
  const [instructions, setInstructions] = useState("");
  const [title, setTitle] = useState("");

  const subjectById = new Map((subjects || []).map((s) => [s.id, s]));
  const plan = describePlan({ difficulty, thinking, logic, durationMinutes: Number(duration) });
  // Until the student picks a subject, show the subject of the preselected note (if any).
  const effectiveSubject =
    subjectFilter === "auto" ? (notes?.find((n) => selected.has(n.id))?.subjectId ?? "all") : subjectFilter;

  const visibleNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (notes || [])
      .filter((n) => effectiveSubject === "all" || n.subjectId === effectiveSubject)
      .filter((n) => !needle || n.title.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [notes, effectiveSubject, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_NOTES) next.add(id);
      return next;
    });
  }

  const allVisibleSelected = visibleNotes.length > 0 && visibleNotes.every((n) => selected.has(n.id));

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleNotes.forEach((n) => next.delete(n.id));
      else for (const n of visibleNotes) if (next.size < MAX_NOTES) next.add(n.id);
      return next;
    });
  }

  const create = useMutation({
    mutationFn: () =>
      testsApi.createTest({
        noteIds: [...selected],
        ...(title.trim() ? { title: title.trim() } : {}),
        settings: {
          difficulty,
          thinking,
          logic,
          durationMinutes: Number(duration),
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        },
      }),
    onSuccess: (test) => {
      rememberWritingTest(test.id);
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      navigate(`/tests/${test.id}`);
    },
  });

  return (
    <Page>
      <PageHeader
        back={{ to: "/tests", label: "Tests" }}
        title="New test"
        description="A long written test from your notes: no answer options, every answer in your own words."
      />

      {writing.length > 0 && (
        <div className="mb-8 border-l-2 border-accent py-1 pl-4" role="status">
          <p className="text-sm font-medium text-fg">{writing.length === 1 ? "A test is still being written" : `${writing.length} tests are still being written`}</p>
          <ul className="mt-1.5 space-y-1">
            {writing.map((t) => (
              <li key={t.id} className="text-[0.8125rem] text-fg-muted">
                <Link to={`/tests/${t.id}`} className="text-accent underline-offset-4 hover:underline">
                  {testTitle(t)}
                </Link>
                {t.generationStartedAt && <> · started {formatDistanceToNow(parseISO(t.generationStartedAt), { addSuffix: true })}</>}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-meta text-fg-faint">It keeps going if you leave, and you'll be told when it's ready. Creating another test here writes a second one.</p>
        </div>
      )}

      {aiEnabled === false && (
        <InlineError className="mb-6">Tests need the AI, and the server has no OpenAI API key configured.</InlineError>
      )}

      <div className="space-y-12">
        <Section
          title="Material"
          description={selected.size > 0 ? `${selected.size} ${selected.size === 1 ? "note" : "notes"} selected` : "Choose the notes the test covers."}
        >
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Select value={effectiveSubject} onValueChange={setSubjectFilter}>
              <SelectTrigger className="sm:w-56" aria-label="Subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by title" aria-label="Filter notes" className="pl-9" />
            </div>
          </div>

          {notesLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          ) : visibleNotes.length === 0 ? (
            <p className="py-4 text-sm text-fg-faint">No notes here.</p>
          ) : (
            <>
              <button type="button" onClick={toggleAllVisible} className="mt-4 text-[0.8125rem] text-accent underline-offset-4 hover:underline">
                {allVisibleSelected ? "Deselect these" : `Select all ${visibleNotes.length}`}
              </button>
              <ul className="mt-2 max-h-80 divide-y divide-rule overflow-y-auto border-y border-rule">
                {visibleNotes.map((n) => {
                  const subject = subjectById.get(n.subjectId);
                  return (
                    <li key={n.id}>
                      <label className="flex cursor-pointer items-center gap-3 py-2.5 pr-2">
                        <Checkbox checked={selected.has(n.id)} onCheckedChange={() => toggle(n.id)} disabled={!selected.has(n.id) && selected.size >= MAX_NOTES} />
                        <span className="min-w-0 flex-1 truncate font-serif text-[0.9375rem] text-fg">{n.title}</span>
                        {effectiveSubject === "all" && subject && <SubjectSwatch color={subject.color} />}
                        <span className="shrink-0 text-meta text-fg-faint tabular">{formatDateShort(n.date)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {selected.size >= MAX_NOTES && <p className="mt-2 text-meta text-warn">A test can cover up to {MAX_NOTES} notes.</p>}
            </>
          )}
        </Section>

        <Section title="The test" description="Shape it to what you're preparing for.">
          <div className="divide-y divide-rule">
            <SettingRow label="Difficulty">
              <Segmented
                label="Difficulty"
                value={difficulty}
                onChange={setDifficulty}
                options={(Object.keys(DIFFICULTY_LABELS) as testsApi.TestDifficulty[]).map((v) => ({ value: v, label: DIFFICULTY_LABELS[v] }))}
                className="w-full sm:w-auto"
              />
            </SettingRow>
            <SettingRow label="Kind of thinking" hint={THINKING_LABELS[thinking].description}>
              <Segmented
                label="Kind of thinking"
                value={thinking}
                onChange={setThinking}
                options={(Object.keys(THINKING_LABELS) as testsApi.TestThinking[]).map((v) => ({ value: v, label: THINKING_LABELS[v].label }))}
                className="w-full sm:w-auto"
              />
            </SettingRow>
            <SettingRow label="Logic and problem solving" hint={LOGIC_LABELS[logic].description}>
              <Segmented
                label="Logic and problem solving"
                value={logic}
                onChange={setLogic}
                options={(Object.keys(LOGIC_LABELS) as testsApi.TestLogic[]).map((v) => ({ value: v, label: LOGIC_LABELS[v].label }))}
                className="w-full sm:w-auto"
              />
            </SettingRow>
            <SettingRow label="Length" hint="How long a well-prepared student would need.">
              <Segmented
                label="Length"
                value={duration}
                onChange={setDuration}
                options={DURATIONS.map((d) => ({ value: String(d), label: `${d} min` }))}
                className="w-full sm:w-auto"
              />
            </SettingRow>
            <SettingRow label="Notes for the AI" hint="Optional. Anything that helps it write the test you need.">
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={1500}
                rows={4}
                placeholder="e.g. like our end-of-term exam, mostly calculations, include one question comparing the two theories, skip chapter 3"
              />
            </SettingRow>
            <SettingRow label="Title">
              <Field label="Title" className="[&>label]:sr-only">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Leave empty to let the AI name it" />
              </Field>
            </SettingRow>
          </div>
        </Section>

        <div className="flex flex-col gap-3 border-t border-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" aria-live="polite">
            <p className="text-sm text-fg">
              <span className="font-medium tabular">{plan.total} questions</span>
              <span className="text-fg-muted"> · {duration} min · {plan.parts.join(", ")}</span>
            </p>
            <p className="mt-0.5 text-meta text-fg-faint">
              {plan.problems > 0
                ? `${plan.problems} of them ${plan.problems === 1 ? "is a problem" : "are problems"} to reason through. `
                : ""}
              Points follow the work each question takes.
            </p>
            <InlineError className="mt-2">{create.error ? getErrorMessage(create.error, "Couldn't create the test") : null}</InlineError>
          </div>
          <Button size="lg" onClick={() => create.mutate()} disabled={selected.size === 0 || aiEnabled === false || create.isPending} className="sm:ml-auto">
            {create.isPending ? "Starting..." : "Create test"}
          </Button>
        </div>
      </div>
    </Page>
  );
}
