import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotesRevealToggle } from "./NotesRevealToggle";
import { QuizRunner } from "./QuizRunner";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short answer" },
] as const;

export function QuizTool({ noteId }: { noteId: string }) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Quiz</h3>
        <NotesRevealToggle />
      </div>

      {!data && !isPending && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Questions</Label>
              <Select value={String(numQuestions)} onValueChange={(v) => setNumQuestions(Number(v) as 5 | 10 | 15 | 20)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question types</Label>
            {QUESTION_TYPES.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-sm">
                <Checkbox checked={questionTypes.includes(t.value)} onCheckedChange={() => toggleType(t.value)} />
                {t.label}
              </label>
            ))}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={includeBeyondNotes} onCheckedChange={(v) => setIncludeBeyondNotes(v === true)} className="mt-0.5" />
            <span>
              Include one question beyond my notes
              <span className="block text-xs text-muted-foreground">Adds an extra question testing related knowledge not in your notes - clearly marked so you know it's different.</span>
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{getErrorMessage(error, "Could not generate quiz")}</p>}

          <Button className="w-full" disabled={questionTypes.length === 0} onClick={() => mutate()}>
            Generate Quiz
          </Button>
        </div>
      )}

      {isPending && (
        <div className="space-y-2 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <p className="pt-2 text-center text-xs text-muted-foreground">Generating your quiz...</p>
        </div>
      )}

      {data && <QuizRunner quiz={data} onRestart={() => reset()} />}
    </div>
  );
}
