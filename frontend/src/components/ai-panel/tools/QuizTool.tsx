import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import * as quizzesApi from "@/api/quizzes";
import { InlineError } from "@/components/shared/EmptyState";
import { Checkbox } from "@/components/ui/checkbox";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DIFFICULTY_OPTIONS } from "./options";
import { QuizRunner } from "./QuizRunner";
import { BeyondNotesOption, GeneratingState, SetupRow, ToolSetup } from "./ToolParts";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True or false" },
  { value: "short_answer", label: "Short answer" },
] as const;

const COUNTS = ["5", "10", "15", "20"] as const;

type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

function QuizHistory({ noteId, onOpen, opening }: { noteId: string; onOpen: (id: string) => void; opening: boolean }) {
  const { data } = useQuery({ queryKey: ["quizzes", noteId], queryFn: () => quizzesApi.listQuizzes(noteId) });
  if (!data || data.length === 0) return null;

  const completed = data.filter((q) => q.status === "completed");
  const correct = completed.reduce((s, q) => s + q.score, 0);
  const asked = completed.reduce((s, q) => s + q.total, 0);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <h3 className="group-label">Earlier quizzes on this note</h3>
        {asked > 0 && (
          <span className="text-meta text-fg-faint">
            {Math.round((correct / asked) * 100)}% right overall
          </span>
        )}
      </div>
      <ul className="divide-y divide-rule">
        {data.slice(0, 12).map((q) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => onOpen(q.id)}
              disabled={opening}
              className="group flex w-full items-baseline justify-between gap-3 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm text-fg group-hover:text-accent">
                  {q.status === "completed" ? `${q.score} of ${q.total} correct` : `In progress · ${q.answered} of ${q.total} answered`}
                </span>
                <span className="block text-meta text-fg-faint">
                  {q.settings.difficulty[0].toUpperCase() + q.settings.difficulty.slice(1)}
                  {q.retryOf ? " · retry" : ""}
                </span>
              </span>
              <span className="shrink-0 text-meta text-fg-faint">{formatDistanceToNow(parseISO(q.createdAt), { addSuffix: true })}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QuizTool({ noteId, noteTitle, active }: { noteId: string; noteTitle: string; active: boolean }) {
  const queryClient = useQueryClient();
  const [numQuestions, setNumQuestions] = useState<5 | 10 | 15 | 20>(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["multiple_choice", "true_false"]);
  const [includeBeyondNotes, setIncludeBeyondNotes] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [attempt, setAttempt] = useState<quizzesApi.QuizAttempt | null>(null);

  // Generate the questions, then store them as a new attempt. If storing fails the quiz still
  // runs - it just won't be kept.
  const generate = useMutation({
    mutationFn: async () => {
      const settings: quizzesApi.QuizSettings = {
        numQuestions,
        difficulty,
        questionTypes,
        includeBeyondNotes,
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      };
      const quiz = await aiApi.generateQuiz({ noteIds: [noteId], ...settings, numQuestions });
      try {
        return await quizzesApi.createQuiz({ noteIds: [noteId], settings, questions: quiz.questions });
      } catch {
        const now = new Date().toISOString();
        return {
          id: "",
          noteId,
          noteIds: [noteId],
          subjectId: null,
          title: noteTitle,
          settings,
          status: "in_progress",
          score: 0,
          answered: 0,
          total: quiz.questions.length,
          retryOf: null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          questions: quiz.questions,
          answers: quiz.questions.map(() => ({ checked: false })),
        } satisfies quizzesApi.QuizAttempt;
      }
    },
    onSuccess: (created) => {
      setAttempt(created);
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });

  const openExisting = useMutation({ mutationFn: quizzesApi.getQuiz, onSuccess: setAttempt });

  const retry = useMutation({
    mutationFn: (from: quizzesApi.QuizAttempt) =>
      quizzesApi.createQuiz({ noteIds: from.noteIds, settings: from.settings, questions: from.questions, retryOf: from.retryOf ?? from.id }),
    onSuccess: (created) => {
      setAttempt(created);
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });

  function toggleType(type: QuestionType) {
    setQuestionTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  if (generate.isPending) return <GeneratingState label={`Writing ${numQuestions} questions from "${noteTitle}"...`} />;

  if (attempt) {
    return (
      <>
        {!attempt.id && <p className="mb-4 text-meta text-warn">This quiz couldn't be saved, so it won't appear in your history.</p>}
        <InlineError className="mb-4">{retry.isError ? getErrorMessage(retry.error, "Couldn't start the retry") : null}</InlineError>
        <QuizRunner
          key={attempt.id || attempt.createdAt}
          attempt={attempt}
          onNewQuiz={() => {
            setAttempt(null);
            generate.reset();
          }}
          onRetry={() => retry.mutate(attempt)}
          isRetrying={retry.isPending}
          active={active}
        />
      </>
    );
  }

  return (
    <div>
      <ToolSetup
        intro="Answer questions written from this note, one at a time, with an explanation after each. The note is hidden while you work, and every quiz is saved."
        error={generate.error ? getErrorMessage(generate.error, "Could not generate quiz") : openExisting.error ? getErrorMessage(openExisting.error, "Couldn't open that quiz") : null}
        submitLabel="Start quiz"
        onSubmit={() => generate.mutate()}
        disabled={questionTypes.length === 0}
      >
        <SetupRow label="Questions">
          <Segmented
            label="Number of questions"
            value={String(numQuestions) as (typeof COUNTS)[number]}
            onChange={(v) => setNumQuestions(Number(v) as 5 | 10 | 15 | 20)}
            options={COUNTS.map((n) => ({ value: n, label: n }))}
            className="w-full"
          />
        </SetupRow>
        <SetupRow label="Difficulty">
          <Segmented label="Difficulty" value={difficulty} onChange={setDifficulty} options={[...DIFFICULTY_OPTIONS]} className="w-full" />
        </SetupRow>
        <SetupRow label="Question types">
          <div className="space-y-2.5">
            {QUESTION_TYPES.map((t) => (
              <label key={t.value} className="flex cursor-pointer items-center gap-3 text-sm text-fg">
                <Checkbox checked={questionTypes.includes(t.value)} onCheckedChange={() => toggleType(t.value)} />
                {t.label}
              </label>
            ))}
            {questionTypes.length === 0 && <p className="text-meta text-warn">Choose at least one type.</p>}
          </div>
        </SetupRow>
        <SetupRow label="Anything specific? (optional)">
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="e.g. focus on the formulas, skip the history part, make the questions like our teacher's"
            className={cn("resize-none text-[0.8125rem]")}
          />
        </SetupRow>
        <BeyondNotesOption checked={includeBeyondNotes} onChange={setIncludeBeyondNotes} />
      </ToolSetup>

      <p className="mt-4 text-meta text-fg-faint">
        Want a long written test instead?{" "}
        <Link to={`/tests/new?noteIds=${noteId}`} className="text-accent underline-offset-4 hover:underline">
          Create a test from this note
        </Link>
      </p>

      <QuizHistory noteId={noteId} onOpen={(id) => openExisting.mutate(id)} opening={openExisting.isPending} />
    </div>
  );
}
