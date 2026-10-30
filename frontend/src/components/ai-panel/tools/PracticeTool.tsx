import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { InlineMarkdown } from "@/components/notes/InlineMarkdown";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { DIFFICULTY_OPTIONS } from "./options";
import { BeyondNotesMark, BeyondNotesOption, GeneratingState, SetupRow, ToolSetup } from "./ToolParts";

const TYPE_LABEL: Record<string, string> = {
  calculation: "Calculation",
  short_answer: "Short answer",
  application: "Application",
  concept: "Concept",
};

const COUNTS = ["3", "5", "8", "10", "15"] as const;

const revealButton =
  "inline-flex h-8 items-center rounded-sm px-2 text-[0.8125rem] font-medium text-fg-muted transition-colors hover:bg-tint hover:text-fg";

function PracticeQuestionItem({ question, number }: { question: aiApi.PracticeQuestion; number: number }) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <li className="flex gap-3 py-5">
      <span className="w-5 shrink-0 pt-0.5 text-right text-sm text-fg-faint tabular">{number}</span>
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-fg-faint">
          {TYPE_LABEL[question.type] ?? question.type}
          {question.beyondNotes && <BeyondNotesMark />}
        </p>
        <InlineMarkdown className="text-[1rem] leading-relaxed text-fg" content={question.question} />

        {showHint && question.hint && (
          <div className="text-[0.9375rem] italic text-fg-muted">
            <InlineMarkdown className="inline" content={`Hint: ${question.hint}`} />
          </div>
        )}
        {showAnswer && (
          <div className="space-y-1 border-l-2 border-accent pl-3" aria-live="polite">
            <p className="text-meta font-medium text-fg-faint">Answer</p>
            <InlineMarkdown className="text-[0.9375rem] text-fg" content={question.answer} />
          </div>
        )}

        <div className="-ml-2 flex gap-1">
          {question.hint && !showAnswer && (
            <button type="button" onClick={() => setShowHint((v) => !v)} className={revealButton}>
              {showHint ? "Hide hint" : "Hint"}
            </button>
          )}
          <button type="button" onClick={() => setShowAnswer((v) => !v)} className={revealButton}>
            {showAnswer ? "Hide answer" : "Show answer"}
          </button>
        </div>
      </div>
    </li>
  );
}

export function PracticeTool({ noteId, noteTitle }: { noteId: string; noteTitle: string }) {
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [includeBeyondNotes, setIncludeBeyondNotes] = useState(false);

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () => aiApi.generatePractice({ noteIds: [noteId], numQuestions, difficulty, includeBeyondNotes }),
  });

  if (isPending) return <GeneratingState label={`Writing ${numQuestions} practice questions from "${noteTitle}"...`} />;

  if (data) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-fg-muted">
            Work each one out on paper first, then check the answer.
          </p>
          <Button size="sm" variant="ghost" className="-mr-2.5 shrink-0" onClick={() => reset()}>
            New set
          </Button>
        </div>
        {/* Keyed by the result so a new set starts with every answer hidden again. */}
        <ol key={data.questions.map((q) => q.question).join("|")} className="mt-3 divide-y divide-rule border-y border-rule">
          {data.questions.map((q, i) => (
            <PracticeQuestionItem key={i} question={q} number={i + 1} />
          ))}
        </ol>
      </div>
    );
  }

  return (
    <ToolSetup
      intro="Open-ended questions - calculations, explanations, applications - to work through on paper, with hints and worked answers to check against."
      error={error ? getErrorMessage(error, "Could not generate practice questions") : null}
      submitLabel="Write practice questions"
      onSubmit={() => mutate()}
    >
      <SetupRow label="Questions">
        <Segmented
          label="Number of questions"
          value={String(numQuestions) as (typeof COUNTS)[number]}
          onChange={(v) => setNumQuestions(Number(v))}
          options={COUNTS.map((n) => ({ value: n, label: n }))}
          className="w-full"
        />
      </SetupRow>
      <SetupRow label="Difficulty">
        <Segmented label="Difficulty" value={difficulty} onChange={setDifficulty} options={[...DIFFICULTY_OPTIONS]} className="w-full" />
      </SetupRow>
      <BeyondNotesOption checked={includeBeyondNotes} onChange={setIncludeBeyondNotes} />
    </ToolSetup>
  );
}
