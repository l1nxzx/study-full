import { Check, Pencil, Sparkles, Undo2, X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import type { AlterationAction } from "@/lib/aiMarkup";

interface AiAlterSpanProps {
  original: string;
  corrected: string;
  onResolve?: (action: AlterationAction, manualText?: string) => void;
}

// A correction the AI made to garbled/misread text. Shows both versions side by side -
// once the user accepts, rejects, or manually retypes it (here or via the note's bulk
// review banner), the caller rewrites the note's Markdown so this unwraps into plain
// text permanently.
export function AiAlterSpan({ original, corrected, onResolve }: AiAlterSpanProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(corrected);

  function confirmManual() {
    const text = draft.trim();
    if (!text) return;
    onResolve?.("manual", text);
    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmManual();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      setDraft(corrected);
    }
  }

  if (isEditing) {
    return (
      <span className="mx-0.5 inline-flex items-center gap-1 align-baseline">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          size={Math.max(6, draft.length)}
          className="rounded border border-primary bg-transparent px-1 py-0.5 text-sm text-foreground focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={confirmManual}
          title="Save my correction"
          className="inline-flex size-4 items-center justify-center rounded-sm text-success hover:bg-success/15"
        >
          <Check className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setDraft(corrected);
          }}
          title="Cancel"
          className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted"
        >
          <X className="size-3" />
        </button>
      </span>
    );
  }

  return (
    <span className="mx-0.5 inline whitespace-normal align-baseline">
      <span className="text-destructive/70 line-through decoration-destructive/50">{original}</span>{" "}
      <span className="rounded bg-warning/20 px-1 py-0.5 text-foreground">{corrected}</span>
      {onResolve && (
        <span className="ml-1 inline-flex items-center gap-0.5 align-middle">
          <button
            type="button"
            onClick={() => onResolve("accept")}
            title="Keep the AI's correction"
            className="inline-flex size-4 items-center justify-center rounded-sm text-success hover:bg-success/15"
          >
            <Check className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => onResolve("reject")}
            title="Keep my original text"
            className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted"
          >
            <Undo2 className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(corrected);
              setIsEditing(true);
            }}
            title="The AI got this wrong too - type the correct text myself"
            className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted"
          >
            <Pencil className="size-3" />
          </button>
        </span>
      )}
    </span>
  );
}

interface AiAddSpanProps {
  text: string;
  onRemove?: () => void;
}

// Content the AI inferred should be there but wasn't legible/present in the photo at
// all. Stays visibly marked permanently (by design) so it's never mistaken for the
// student's own original notes, even after review.
export function AiAddSpan({ text, onRemove }: AiAddSpanProps) {
  return (
    <span className="mx-0.5 inline-flex items-baseline gap-1 rounded-md border border-accent bg-accent/50 px-1.5 py-0.5 align-baseline">
      <Sparkles className="relative top-px size-3 shrink-0 text-accent-foreground/70" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-accent-foreground/70">AI</span>
      <span className="text-accent-foreground">{text}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove this AI-added content"
          className="inline-flex size-3.5 items-center justify-center rounded-sm text-accent-foreground/60 hover:bg-accent hover:text-accent-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
