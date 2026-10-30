import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/shared/EmptyState";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { SkeletonLines } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Step = "config" | "loading" | "result";
type Scope = "full" | "selection";

interface SelectionRange {
  start: number;
  end: number;
}

interface AiRewriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  contentMarkdown: string;
  onApply: (newContent: string) => void;
}

const SCOPES: { value: Scope; label: string; description: string }[] = [
  { value: "full", label: "The whole note", description: "Rewrites it section by section." },
  { value: "selection", label: "Just one passage", description: "Select the part to rewrite in the next step." },
];

const INSTRUCTION_EXAMPLES = [
  'e.g. "make it more concise"',
  'e.g. "add a real-world example"',
  'e.g. "explain the formula step by step"',
];

export function AiRewriteDialog({ open, onOpenChange, noteId, contentMarkdown, onApply }: AiRewriteDialogProps) {
  const [step, setStep] = useState<Step>("config");
  const [scope, setScope] = useState<Scope>("full");
  const [instructions, setInstructions] = useState("");
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Every time the dialog is (re)opened it starts from a clean slate - a half-finished
  // rewrite from a previous visit shouldn't linger.
  useEffect(() => {
    if (open) {
      setStep("config");
      setScope("full");
      setInstructions("");
      setSelection(null);
      setResult(null);
      setError(null);
    }
  }, [open]);

  const rewriteMutation = useMutation({
    mutationFn: () => {
      const trimmedInstructions = instructions.trim() || undefined;
      if (scope === "selection" && selection) {
        return aiApi.rewriteNote(noteId, {
          scope: "selection",
          selectionText: contentMarkdown.slice(selection.start, selection.end),
          instructions: trimmedInstructions,
        });
      }
      return aiApi.rewriteNote(noteId, { scope: "full", instructions: trimmedInstructions });
    },
    onSuccess: (data) => {
      setResult(data.rewritten);
      setStep("result");
    },
    onError: (err) => {
      setError(getErrorMessage(err, "Could not rewrite this note"));
      setStep("config");
    },
  });

  function handleGenerate() {
    if (scope === "selection" && !selection) return;
    setError(null);
    setStep("loading");
    rewriteMutation.mutate();
  }

  function handleApply() {
    if (!result) return;
    if (scope === "selection" && selection) {
      onApply(contentMarkdown.slice(0, selection.start) + result + contentMarkdown.slice(selection.end));
    } else {
      onApply(result);
    }
    onOpenChange(false);
  }

  function handleTextareaSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    const target = e.currentTarget;
    if (target.selectionStart === target.selectionEnd) {
      setSelection(null);
    } else {
      setSelection({ start: target.selectionStart, end: target.selectionEnd });
    }
  }

  const originalSnippet = scope === "selection" && selection ? contentMarkdown.slice(selection.start, selection.end) : contentMarkdown;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rewrite with AI</DialogTitle>
          {step === "config" && (
            <DialogDescription>
              Rewrites the wording and structure to read more clearly - useful for notes typed quickly in class. Nothing is removed, but
              it isn't limited to small corrections either. You'll compare before anything changes.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-6">
            <InlineError>{error}</InlineError>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-[0.8125rem] font-medium text-fg-muted">What should it rewrite?</legend>
              <div role="radiogroup" className="divide-y divide-rule border-y border-rule">
                {SCOPES.map((option) => {
                  const selected = scope === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setScope(option.value)}
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

            {scope === "selection" && (
              <Field
                label="Select the passage to rewrite"
                hint={
                  <span className={cn(!selection && "text-warn")}>
                    {selection ? `${selection.end - selection.start} characters selected.` : "Click and drag inside the box to select some text."}
                  </span>
                }
              >
                <Textarea
                  readOnly
                  value={contentMarkdown}
                  onSelect={handleTextareaSelect}
                  className="h-44 resize-none bg-panel font-mono text-[0.8125rem]"
                />
              </Field>
            )}

            <Field label="Anything specific to change or add? (optional)" htmlFor="rewrite-instructions">
              <Textarea
                id="rewrite-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={INSTRUCTION_EXAMPLES.join(", ")}
                className="h-20 resize-none"
              />
            </Field>
          </div>
        )}

        {step === "loading" && (
          <div className="space-y-4 py-2" aria-live="polite">
            <p className="text-sm text-fg-muted">Rewriting {scope === "selection" ? "the selected passage" : "your note"}. This can take a few seconds.</p>
            <SkeletonLines lines={5} />
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <p className="text-[0.8125rem] font-medium text-fg-muted">Original</p>
                <div className="h-72 overflow-y-auto rounded-md border border-rule px-4 py-3">
                  <MarkdownRenderer content={originalSnippet} variant="compact" />
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-[0.8125rem] font-medium text-accent">Rewritten</p>
                <div className="h-72 overflow-y-auto rounded-md border border-accent/40 px-4 py-3">
                  <MarkdownRenderer content={result} variant="compact" />
                </div>
              </div>
            </div>
            <p className="text-meta text-fg-faint">
              Using this replaces {scope === "selection" ? "just the selected passage" : "the whole note"}. You can still edit it afterwards.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "config" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={rewriteMutation.isPending || (scope === "selection" && !selection)}>
                Rewrite
              </Button>
            </>
          )}
          {step === "result" && (
            <>
              <Button variant="ghost" onClick={() => setStep("config")}>
                <ArrowLeft /> Change and retry
              </Button>
              <Button onClick={handleApply}>Use this version</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
