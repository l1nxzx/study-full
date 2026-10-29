import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { InlineMarkdown } from "@/components/notes/InlineMarkdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NotesRevealToggle } from "./NotesRevealToggle";

const TYPE_LABEL: Record<string, string> = {
  calculation: "Calculation",
  short_answer: "Short answer",
  application: "Application",
  concept: "Concept",
};

export function PracticeTool({ noteId }: { noteId: string }) {
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [includeBeyondNotes, setIncludeBeyondNotes] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const { mutate, data, isPending, error } = useMutation({
    mutationFn: () => aiApi.generatePractice({ noteIds: [noteId], numQuestions, difficulty, includeBeyondNotes }),
    onSuccess: () => setRevealed(new Set()),
  });

  function toggleReveal(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Practice Questions</h3>
        <NotesRevealToggle />
      </div>

      {!data && !isPending && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Questions</Label>
              <Select value={String(numQuestions)} onValueChange={(v) => setNumQuestions(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 8, 10, 15].map((n) => (
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

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={includeBeyondNotes} onCheckedChange={(v) => setIncludeBeyondNotes(v === true)} className="mt-0.5" />
            <span>
              Include one question beyond my notes
              <span className="block text-xs text-muted-foreground">Adds an extra question testing related knowledge not in your notes - clearly marked so you know it's different.</span>
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{getErrorMessage(error, "Could not generate practice questions")}</p>}
          <Button className="w-full" onClick={() => mutate()}>
            Generate Practice Questions
          </Button>
        </div>
      )}

      {isPending && (
        <div className="space-y-2 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <p className="pt-2 text-center text-xs text-muted-foreground">Writing practice questions...</p>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {data.questions.map((q, i) => (
            <div key={i} className={cn("rounded-lg border p-3", q.beyondNotes ? "border-warning/40 bg-warning/5" : "border-border")}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{TYPE_LABEL[q.type]}</Badge>
                  {q.beyondNotes && <Badge variant="warning">Beyond your notes</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">Q{i + 1}</span>
              </div>
              <InlineMarkdown className="text-sm font-medium text-foreground" content={q.question} />
              {q.hint && (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  Hint: <InlineMarkdown className="inline" content={q.hint} />
                </p>
              )}

              {revealed.has(i) ? (
                <div className="mt-3 rounded-md bg-muted px-3 py-2">
                  <InlineMarkdown className="text-sm" content={q.answer} />
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => toggleReveal(i)}>
                  Reveal answer
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
