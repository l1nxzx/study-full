import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { buildNotesToMarkdownPrompt } from "@/lib/notesPrompt";
import { cn } from "@/lib/utils";

interface CopyPromptButtonProps {
  subjectName?: string;
  className?: string;
}

// Small, unobtrusive control that copies the exact ChatGPT/Claude prompt used to turn
// photographed handwritten notes into Markdown ready to paste into the content field.
// The prompt is generated per-subject so the AI has that context while transcribing.
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
      title="Copy the ChatGPT / Claude prompt for turning photographed handwritten notes into Markdown"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Prompt"}
    </button>
  );
}
