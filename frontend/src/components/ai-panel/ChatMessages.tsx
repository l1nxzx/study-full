import { AlertCircle, BookOpen, Check, Copy, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import { SkeletonLines } from "@/components/ui/skeleton";
import type { AiChatMessage } from "@/hooks/useAiPanel";
import { cn } from "@/lib/utils";

const actionButton =
  "inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 text-meta text-fg-faint transition-colors hover:bg-tint hover:text-fg";

function MessageActions({ message, onRegenerate }: { message: AiChatMessage; onRegenerate?: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard access denied - nothing useful to do
    }
  }

  return (
    <div className="-ml-1.5 flex items-center">
      <button type="button" onClick={handleCopy} className={actionButton}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      {onRegenerate && (
        <button type="button" onClick={() => onRegenerate(message.id)} className={actionButton}>
          <RefreshCw className="size-3.5" />
          Regenerate
        </button>
      )}
    </div>
  );
}

// Where an answer came from, stated plainly under it. Only note-based answers carry this.
function SourceLine({ message, sourceTitle }: { message: AiChatMessage; sourceTitle?: string }) {
  if (message.groundedInNote === undefined || !sourceTitle) return null;
  if (message.groundedInNote) {
    return (
      <p className="flex items-center gap-1.5 text-meta text-fg-faint">
        <BookOpen className="size-3.5 shrink-0" />
        <span className="truncate">From your note "{sourceTitle}"</span>
      </p>
    );
  }
  return (
    <p className="flex items-start gap-1.5 text-meta text-warn">
      <TriangleAlert className="mt-px size-3.5 shrink-0" />
      <span>Partly beyond your note - check this against your class materials.</span>
    </p>
  );
}

function UserMessage({ message }: { message: AiChatMessage }) {
  // Quick actions (Summary / Explain) read as a short instruction rather than a typed question.
  if (message.label === "Explain") {
    return (
      <div className="ml-auto max-w-[88%] space-y-1.5 text-right">
        <p className="text-meta text-fg-faint">Explain this passage</p>
        <blockquote className="border-r-2 border-rule-strong pr-3 text-left font-serif text-[0.9375rem] leading-relaxed text-fg-muted">
          {message.content.replace(/^"|"$/g, "")}
        </blockquote>
      </div>
    );
  }
  return (
    <div className="ml-auto w-fit max-w-[88%] whitespace-pre-wrap rounded-lg rounded-br-xs bg-tint px-3.5 py-2 text-sm leading-relaxed text-fg">
      {message.content}
    </div>
  );
}

function AssistantMessage({
  message,
  sourceTitle,
  onRegenerate,
}: {
  message: AiChatMessage;
  sourceTitle?: string;
  onRegenerate?: (id: string) => void;
}) {
  if (message.isRegenerating) {
    return (
      <div className="space-y-2" aria-live="polite">
        <p className="text-meta text-fg-faint">Writing a new answer...</p>
        <SkeletonLines lines={4} />
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="space-y-2 border-l-2 border-bad pl-3">
        <p className="flex items-start gap-1.5 text-sm text-fg">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-bad" />
          {message.content}
        </p>
        {onRegenerate && (
          <button type="button" onClick={() => onRegenerate(message.id)} className={cn(actionButton, "-ml-1.5 text-fg-muted")}>
            <RefreshCw className="size-3.5" />
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {message.label && <p className="text-meta font-medium text-fg-faint">{message.label}</p>}
      <MarkdownRenderer content={message.content} variant="compact" emptyLabel="(No answer)" />
      <SourceLine message={message} sourceTitle={sourceTitle} />
      <MessageActions message={message} onRegenerate={onRegenerate} />
    </div>
  );
}

export function ChatMessages({
  messages,
  isPending,
  sourceTitle,
  onRegenerate,
}: {
  messages: AiChatMessage[];
  isPending?: boolean;
  sourceTitle?: string;
  onRegenerate?: (id: string) => void;
}) {
  return (
    <div className="space-y-7">
      {messages.map((m) =>
        m.role === "user" ? (
          <UserMessage key={m.id} message={m} />
        ) : (
          <AssistantMessage key={m.id} message={m} sourceTitle={sourceTitle} onRegenerate={onRegenerate} />
        )
      )}
      {isPending && (
        <div className="space-y-2" aria-live="polite">
          <p className="text-meta text-fg-faint">Writing an answer...</p>
          <SkeletonLines lines={3} />
        </div>
      )}
    </div>
  );
}
