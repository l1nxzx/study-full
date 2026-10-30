import { ArrowUp } from "lucide-react";
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder: string;
  /** Extra controls on the left under the field (e.g. Summarize / Explain for a note). */
  actions?: ReactNode;
  autoFocusKey?: unknown;
}

// The question field sits in the panel's footer, ruled off from the conversation - part of
// the workspace, not a floating widget. It grows with the text up to a few lines.
export function Composer({ value, onChange, onSubmit, disabled, placeholder, actions, autoFocusKey }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocusKey !== undefined && window.matchMedia("(min-width: 1024px)").matches) ref.current?.focus();
  }, [autoFocusKey]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <form onSubmit={handleSubmit} className="border-t border-rule px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="flex items-end gap-2 rounded-lg border border-rule-strong bg-canvas py-1.5 pl-3 pr-1.5 transition-colors focus-within:border-accent">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-48 min-h-7 flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed text-fg placeholder:text-fg-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
            canSend ? "bg-accent-fill text-on-accent hover:bg-accent-fill/88" : "bg-tint text-fg-faint"
          )}
        >
          <ArrowUp className="size-4" strokeWidth={2.25} />
        </button>
      </div>
      <div className="mt-2 flex min-h-7 items-center justify-between gap-3">
        <div className="-ml-1.5 flex flex-wrap items-center">{actions}</div>
        {!actions && <p className="hidden shrink-0 text-meta text-fg-faint lg:block">Enter to send, Shift+Enter for a new line</p>}
      </div>
    </form>
  );
}
