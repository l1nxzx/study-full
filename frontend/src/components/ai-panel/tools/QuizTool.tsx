import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Segmented } from "@/components/ui/segmented";
import { DIFFICULTY_OPTIONS } from "./options";
import { QuizRunner } from "./QuizRunner";
import { BeyondNotesOption, GeneratingState, SetupRow, ToolSetup } from "./ToolParts";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True or false" },
  { value: "short_answer", label: "Short answer" },
] as const;

const COUNTS = ["5", "10", "15", "20"] as const;

export function QuizTool({ noteId, noteTitle, active }: { noteId: string; noteTitle: string; active: boolean }) {
  const [numQuestions, setNumQuestions] = useState<5 | 10 | 15 | 20>(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["multiple_choice", "true_false"]);
  const [includeBeyondNotes, setIncludeBeyondNotes] = useState(false);

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () =>
      aiApi.generateQuiz({
        noteIds: [noteId],
        numQuestions,
        difficulty,
        questionTypes: questionTypes as ("multiple_choice" | "true_false" | "short_answer")[],
        includeBeyondNotes,
      }),
  });

  function toggleType(type: string) {
    setQuestionTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  if (isPending) return <GeneratingState label={`Writing ${numQuestions} questions from "${noteTitle}"...`} />;

  if (data) return <QuizRunner quiz={data} onNewQuiz={() => reset()} active={active} />;

  return (
    <ToolSetup
      intro="Answer questions written from this note, one at a time, with an explanation after each. The note is hidden while you work."
      error={error ? getErrorMessage(error, "Could not generate quiz") : null}
      submitLabel="Start quiz"
      onSubmit={() => mutate()}
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
      <BeyondNotesOption checked={includeBeyondNotes} onChange={setIncludeBeyondNotes} />
    </ToolSetup>
  );
}
