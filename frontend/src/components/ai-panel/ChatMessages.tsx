import { AlertCircle, Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import type { AiChatMessage } from "@/hooks/useAiPanel";
import { cn } from "@/lib/utils";

const actionButton =
  "inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 text-meta text-fg-faint transition-colors hover:bg-tint hover:text-fg";
const iconButton = "flex size-7 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-tint hover:text-fg";

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
    <div className="-ml-1.5 flex items-center gap-0.5">
      <button type="button" onClick={handleCopy} className={iconButton} aria-label={copied ? "Copied" : "Copy"} title={copied ? "Copied" : "Copy"}>
        {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      </button>
      {onRegenerate && (
        <button type="button" onClick={() => onRegenerate(message.id)} className={iconButton} aria-label="Regenerate" title="Regenerate">
          <RefreshCw className="size-3.5" />
        </button>
      )}
    </div>
  );
}

// Answers come from the note by default; only one that goes beyond it says so, quietly.
function BeyondNote({ message, sourceTitle }: { message: AiChatMessage; sourceTitle?: string }) {
  if (message.groundedInNote !== false || !sourceTitle) return null;
  return <p className="text-meta italic text-fg-faint">Goes a little beyond your note.</p>;
}

// Three soft dots while an answer is being written.
function Typing({ label }: { label: string }) {
  return (
    <div className="flex h-7 items-center gap-1" role="status" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-pulse rounded-full bg-fg-faint" style={{ animationDelay: `${i * 180}ms` }} />
      ))}
    </div>
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
    <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-xs bg-tint px-4 py-2.5 text-[0.9375rem] leading-relaxed text-fg">
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
    return <Typing label="Writing a new answer" />;
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
    <div className="group/answer space-y-2">
      {message.label && <p className="text-meta font-medium text-fg-faint">{message.label}</p>}
      <MarkdownRenderer content={message.content} variant="compact" emptyLabel="(No answer)" />
      <BeyondNote message={message} sourceTitle={sourceTitle} />
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
    <div className="space-y-8">
      {messages.map((m) =>
        m.role === "user" ? (
          <UserMessage key={m.id} message={m} />
        ) : (
          <AssistantMessage key={m.id} message={m} sourceTitle={sourceTitle} onRegenerate={onRegenerate} />
        )
      )}
      {isPending && <Typing label="Writing an answer" />}
    </div>
  );
}
