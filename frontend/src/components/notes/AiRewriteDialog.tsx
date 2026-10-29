import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4.5 text-primary" /> AI rewrite
          </DialogTitle>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The AI will rewrite the wording and structure to be clearer and more natural - useful for notes typed
              quickly during class. It won't remove information, but it isn't limited to small corrections either.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label>What should it rewrite?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("full")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    scope === "full" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <span className="block font-medium text-foreground">Entire note</span>
                  <span className="text-xs">Rewrites the whole thing, section by section.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope("selection")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    scope === "selection" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <span className="block font-medium text-foreground">Just a part of it</span>
                  <span className="text-xs">Select the passage below to rewrite only that.</span>
                </button>
              </div>
            </div>

            {scope === "selection" && (
              <div className="space-y-1.5">
                <Label>Select the passage to rewrite</Label>
                <Textarea
                  readOnly
                  value={contentMarkdown}
                  onSelect={handleTextareaSelect}
                  className="h-40 resize-none font-mono text-xs leading-relaxed"
                />
                <p className={cn("text-xs", selection ? "text-muted-foreground" : "text-warning")}>
                  {selection
                    ? `${selection.end - selection.start} characters selected.`
                    : "Click and drag inside the box above to select some text."}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rewrite-instructions">Anything specific to change or add? (optional)</Label>
              <Textarea
                id="rewrite-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={INSTRUCTION_EXAMPLES.join(", ")}
                className="h-20 resize-none text-sm"
              />
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-12 animate-pulse items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Rewriting your note...</p>
              <p className="text-xs text-muted-foreground">This can take a few seconds.</p>
            </div>
            <div className="w-full space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Original</Label>
                <div className="h-64 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
                  <MarkdownRenderer content={originalSnippet} className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-primary">
                  <Sparkles className="size-3.5" /> Rewritten
                </Label>
                <div className="h-64 overflow-y-auto rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <MarkdownRenderer content={result} className="text-sm" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Review both sides above. Applying replaces {scope === "selection" ? "just the selected passage" : "the whole note"} - you can still
              edit it manually afterward.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "config" && (
            <Button onClick={handleGenerate} disabled={rewriteMutation.isPending || (scope === "selection" && !selection)}>
              <Wand2 /> Rewrite
            </Button>
          )}
          {step === "result" && (
            <>
              <Button variant="outline" onClick={() => setStep("config")}>
                <ArrowLeft /> Edit & retry
              </Button>
              <Button onClick={handleApply}>
                <Check /> Use this version
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
