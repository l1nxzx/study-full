import { Check, ClipboardCopy } from "lucide-react";
import { useState } from "react";
import { buildNotesToMarkdownPrompt } from "@/lib/notesPrompt";
import { cn } from "@/lib/utils";

interface CopyPromptButtonProps {
  subjectName?: string;
  className?: string;
}

// Copies the exact ChatGPT/Claude prompt used to turn photographed handwritten notes or PDFs
// into Markdown ready to paste into the content field. The prompt is generated per-subject so
// the AI has that context while transcribing.
export function CopyPromptButton({ subjectName, className }: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildNotesToMarkdownPrompt(subjectName));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied - nothing useful to do
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy the ChatGPT / Claude prompt for turning photos or PDFs of handwritten notes into Markdown"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2 text-[0.8125rem] text-fg-muted transition-colors hover:bg-tint hover:text-fg",
        copied && "text-ok hover:text-ok",
        className
      )}
    >
      {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
      {copied ? "Prompt copied" : "Copy conversion prompt"}
    </button>
  );
}
