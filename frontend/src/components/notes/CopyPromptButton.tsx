import { Check, ClipboardCopy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildConversionPrompt,
  PROMPT_FIDELITIES,
  PROMPT_SOURCES,
  type PromptFidelity,
  type PromptSource,
} from "@/lib/notesPrompt";
import { cn } from "@/lib/utils";

interface CopyPromptButtonProps {
  subjectName?: string;
  className?: string;
}

const STORAGE_KEY = "study.conversionPrompt";

function loadChoice(): { source: PromptSource; fidelity: PromptFidelity } {
  const fallback = { source: "handwritten" as PromptSource, fidelity: "exact" as PromptFidelity };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return {
      source: PROMPT_SOURCES.some((o) => o.value === saved?.source) ? saved.source : fallback.source,
      fidelity: PROMPT_FIDELITIES.some((o) => o.value === saved?.fidelity) ? saved.fidelity : fallback.fidelity,
    };
  } catch {
    return fallback;
  }
}

function OptionList<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string; description: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[0.8125rem] font-medium text-fg-muted">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="divide-y divide-rule border-y border-rule">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn("flex w-full items-start gap-3 px-2 py-3 text-left transition-colors", selected ? "bg-accent/[0.07]" : "hover:bg-tint/60")}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-accent-fill" : "border-rule-strong"
                )}
              >
                {selected && <span className="size-2 rounded-full bg-accent-fill" />}
              </span>
              <span>
                <span className="block text-sm font-medium text-fg">{option.label}</span>
                <span className="block text-[0.8125rem] text-fg-muted">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Opens the choice of ChatGPT/Claude prompt for turning class material into Markdown ready to
// paste into the content field: what is being converted (handwritten notes or a presentation)
// and how freely the AI may treat it. The prompt is generated per-subject so the AI has that
// context, and the last choice is remembered on this device.
export function CopyPromptButton({ subjectName, className }: CopyPromptButtonProps) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(loadChoice);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  function update(next: Partial<typeof choice>) {
    const merged = { ...choice, ...next };
    setChoice(merged);
    setCopied(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // storage unavailable - the choice just isn't remembered
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildConversionPrompt({ ...choice, subjectName }));
      setFailed(false);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 900);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCopied(false);
          setFailed(false);
          setOpen(true);
        }}
        title="Get a ChatGPT / Claude prompt for turning handwritten notes or a presentation into Markdown"
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2 text-[0.8125rem] text-fg-muted transition-colors hover:bg-tint hover:text-fg",
          className
        )}
      >
        <ClipboardCopy className="size-3.5" />
        Conversion prompt
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conversion prompt</DialogTitle>
            <DialogDescription>
              Copy the prompt, give it to ChatGPT or Claude together with your files, and paste what comes back into the note.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <OptionList legend="What are you converting?" options={PROMPT_SOURCES} value={choice.source} onChange={(source) => update({ source })} />
            <OptionList
              legend="How closely should it follow the original?"
              options={PROMPT_FIDELITIES}
              value={choice.fidelity}
              onChange={(fidelity) => update({ fidelity })}
            />
            {failed && (
              <p role="alert" className="text-[0.8125rem] text-bad">
                Couldn't copy to the clipboard. Allow clipboard access for this site and try again.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={handleCopy}>
              {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
              {copied ? "Prompt copied" : "Copy prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
