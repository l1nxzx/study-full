import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { InlineMarkdown } from "@/components/notes/InlineMarkdown";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function FlashcardsTool({ noteId }: { noteId: string }) {
  const [count, setCount] = useState(10);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const { mutate, data, isPending, error } = useMutation({
    mutationFn: () => aiApi.generateFlashcards([noteId], count),
    onSuccess: () => {
      setIndex(0);
      setRevealed(false);
    },
  });

  const card = data?.cards[index];

  function go(delta: number) {
    if (!data) return;
    setIndex((i) => Math.min(Math.max(i + delta, 0), data.cards.length - 1));
    setRevealed(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Flashcards</h3>

      {!data && !isPending && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Number of cards</Label>
            <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
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
          {error && <p className="text-sm text-destructive">{getErrorMessage(error, "Could not generate flashcards")}</p>}
          <Button className="w-full" onClick={() => mutate()}>
            Generate Flashcards
          </Button>
        </div>
      )}

      {isPending && (
        <div className="space-y-2 py-4">
          <Skeleton className="h-32 w-full" />
          <p className="text-center text-xs text-muted-foreground">Generating flashcards...</p>
        </div>
      )}

      {card && (
        <div className="space-y-4">
          <p className="text-center text-xs text-muted-foreground">
            {index + 1} / {data!.cards.length}
          </p>
          <button
            onClick={() => setRevealed((r) => !r)}
            className="flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-border bg-muted/50 p-4 text-center transition-colors hover:bg-muted"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {revealed ? "Answer" : "Question"}
            </p>
            <InlineMarkdown className="mt-2 text-sm font-medium text-foreground" content={revealed ? card.answer : card.question} />
            {!revealed && <p className="mt-3 text-xs text-muted-foreground">Click to reveal answer</p>}
          </button>
          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={index === 0}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => go(1)} disabled={index === data!.cards.length - 1}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
