import { Check, Pencil, Undo2, X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import type { AlterationAction } from "@/lib/aiMarkup";
import { cn } from "@/lib/utils";

const markButton =
  "inline-flex size-5 items-center justify-center rounded-xs font-sans text-fg-faint transition-colors hover:bg-tint hover:text-fg";

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
          className="rounded-sm border border-accent bg-canvas px-1.5 py-0.5 font-sans text-sm text-fg focus-visible:outline-none"
        />
        <button type="button" onClick={confirmManual} title="Save my correction" className={cn(markButton, "text-ok")}>
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setDraft(corrected);
          }}
          title="Cancel"
          className={markButton}
        >
          <X className="size-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline whitespace-normal align-baseline">
      <span className="text-fg-faint line-through decoration-bad/60">{original}</span>{" "}
      <span className="rounded-xs bg-warn/15 px-[0.2em] text-fg underline decoration-warn/70 decoration-dotted underline-offset-4">
        {corrected}
      </span>
      {onResolve && (
        <span className="ml-1 inline-flex items-center align-middle">
          <button type="button" onClick={() => onResolve("accept")} title="Keep the AI's correction" className={cn(markButton, "hover:text-ok")}>
            <Check className="size-3.5" />
          </button>
          <button type="button" onClick={() => onResolve("reject")} title="Keep my original text" className={markButton}>
            <Undo2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(corrected);
              setIsEditing(true);
            }}
            title="The AI got this wrong too - type the correct text myself"
            className={markButton}
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
    <span className="inline align-baseline">
      <span className="mr-1 align-[0.12em] font-sans text-[0.625rem] font-semibold tracking-wide text-accent" title="Added by the AI, not in the original notes">
        AI
      </span>
      <span className="text-fg underline decoration-accent/60 decoration-dashed underline-offset-4">{text}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} title="Remove this AI-added content" className={cn(markButton, "ml-0.5 align-middle hover:text-bad")}>
          <X className="size-3.5" />
        </button>
      )}
    </span>
  );
}
