import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { InlineMarkdown } from "@/components/notes/InlineMarkdown";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { GeneratingState, SetupRow, ToolSetup } from "./ToolParts";

const COUNTS = ["5", "10", "15", "20"] as const;

type Mark = "again" | "known";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable));
}

function Deck({ cards, onNewSet, active }: { cards: aiApi.Flashcard[]; onNewSet: () => void; active: boolean }) {
  // `deck` is the order of card indices for this round: all cards, or just the ones marked "again".
  const [deck, setDeck] = useState(() => cards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [finished, setFinished] = useState(false);

  const cardIndex = deck[position];
  const card = cards[cardIndex];

  function go(delta: number) {
    const next = position + delta;
    if (next < 0) return;
    if (next >= deck.length) {
      setFinished(true);
      return;
    }
    setPosition(next);
    setRevealed(false);
  }

  function mark(value: Mark) {
    setMarks((m) => ({ ...m, [cardIndex]: value }));
    go(1);
  }

  function startRound(indices: number[]) {
    setDeck(indices);
    setPosition(0);
    setRevealed(false);
    setFinished(false);
    setMarks((m) => {
      const next = { ...m };
      for (const i of indices) delete next[i];
      return next;
    });
  }

  useEffect(() => {
    if (!active || finished) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === " " || (e.key === "Enter" && !revealed)) {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (e.key === "ArrowRight") {
        go(1);
      } else if (e.key === "ArrowLeft") {
        go(-1);
      } else if (revealed && e.key === "1") {
        mark("again");
      } else if (revealed && e.key === "2") {
        mark("known");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (finished) {
    const again = deck.filter((i) => marks[i] === "again");
    const known = deck.filter((i) => marks[i] === "known");
    return (
      <div className="space-y-5">
        <div>
          <p className="text-meta text-fg-faint">Round finished</p>
          <p className="mt-1 text-xl font-semibold text-fg">
            {deck.length} {deck.length === 1 ? "card" : "cards"} reviewed
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {known.length} marked as known, {again.length} to go over again
            {deck.length - known.length - again.length > 0 ? `, ${deck.length - known.length - again.length} skipped` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {again.length > 0 && (
            <Button size="sm" onClick={() => startRound(again)}>
              Go over the {again.length} again
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => startRound(cards.map((_, i) => i))}>
            Start over
          </Button>
          <Button size="sm" variant="ghost" onClick={onNewSet}>
            New set
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between text-meta">
          <span className="font-medium text-fg-muted">
            Card {position + 1} <span className="text-fg-faint">of {deck.length}</span>
          </span>
          {deck.length < cards.length && <span className="text-fg-faint">Reviewing marked cards</span>}
        </div>
        <div className="h-0.5 w-full bg-rule">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${((position + (revealed ? 1 : 0.5)) / deck.length) * 100}%` }} />
        </div>
      </div>

      {/* The card itself: a sheet of paper. Question on top; the answer is revealed beneath it. */}
      <div className="overflow-hidden rounded-lg border border-rule bg-canvas">
        <div className="flex min-h-40 items-center px-5 py-7">
          <InlineMarkdown className="w-full text-[1.125rem] leading-relaxed text-fg" content={card.question} />
        </div>
        {revealed ? (
          <div className="border-t border-dashed border-rule-strong px-5 py-5" aria-live="polite">
            <p className="mb-1.5 text-meta text-fg-faint">Answer</p>
            <InlineMarkdown className="text-[1.0625rem] leading-relaxed text-fg" content={card.answer} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="flex h-12 w-full items-center justify-center gap-2 border-t border-rule text-sm text-fg-muted transition-colors hover:bg-tint/60 hover:text-fg"
          >
            Show answer <Kbd className="hidden lg:inline-flex">Space</Kbd>
          </button>
        )}
      </div>

      {revealed ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => mark("again")}>
            Again <Kbd className="hidden lg:inline-flex">1</Kbd>
          </Button>
          <Button variant="outline" onClick={() => mark("known")}>
            Got it <Kbd className="hidden lg:inline-flex">2</Kbd>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="-ml-2.5" onClick={() => go(-1)} disabled={position === 0}>
            <ChevronLeft /> Previous
          </Button>
          <Button variant="ghost" size="sm" className="-mr-2.5" onClick={() => go(1)}>
            Skip <ChevronRight />
          </Button>
        </div>
      )}

      <p className={cn("hidden text-meta text-fg-faint lg:block")}>Space shows the answer, arrows move between cards.</p>
    </div>
  );
}

export function FlashcardsTool({ noteId, noteTitle, active }: { noteId: string; noteTitle: string; active: boolean }) {
  const [count, setCount] = useState(10);

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () => aiApi.generateFlashcards([noteId], count),
  });

  if (isPending) return <GeneratingState label={`Making ${count} flashcards from "${noteTitle}"...`} />;

  if (data) {
    if (data.cards.length === 0) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">No flashcards came back for this note. It may be too short to make cards from.</p>
          <Button size="sm" variant="outline" onClick={() => reset()}>
            Back
          </Button>
        </div>
      );
    }
    return <Deck key={data.cards.length + data.cards[0].question} cards={data.cards} onNewSet={() => reset()} active={active} />;
  }

  return (
    <ToolSetup
      intro="Revise with question-and-answer cards made from this note. Reveal each answer, then sort the card into 'again' or 'got it'."
      error={error ? getErrorMessage(error, "Could not generate flashcards") : null}
      submitLabel="Make flashcards"
      onSubmit={() => mutate()}
    >
      <SetupRow label="Cards">
        <Segmented
          label="Number of cards"
          value={String(count) as (typeof COUNTS)[number]}
          onChange={(v) => setCount(Number(v))}
          options={COUNTS.map((n) => ({ value: n, label: n }))}
          className="w-full"
        />
      </SetupRow>
    </ToolSetup>
  );
}
