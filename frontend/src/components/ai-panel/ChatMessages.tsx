import { AlertCircle, Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import type { AiChatMessage } from "@/hooks/useAiPanel";
import { cn } from "@/lib/utils";

function MessageActions({ message, onRegenerate }: { message: AiChatMessage; onRegenerate?: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-1 border-t border-border/60 pt-1.5 opacity-70">
      <button
        type="button"
        onClick={handleCopy}
        title="Copy message"
        className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[11px] hover:bg-black/5 dark:hover:bg-white/5"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      {onRegenerate && (
        <button
          type="button"
          onClick={() => onRegenerate(message.id)}
          title="Regenerate"
          className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[11px] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <RefreshCw className="size-3" />
          Regenerate
        </button>
      )}
    </div>
  );
}

export function ChatMessages({
  messages,
  isPending,
  onRegenerate,
}: {
  messages: AiChatMessage[];
  isPending?: boolean;
  onRegenerate?: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[92%] rounded-lg px-3 py-2 text-sm",
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              m.isRegenerating && "opacity-60"
            )}
          >
            {m.label && (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">{m.label}</p>
            )}
            {m.role === "assistant" ? (
              m.isRegenerating ? (
                <p className="italic text-muted-foreground">Regenerating...</p>
              ) : (
                <MarkdownRenderer
                  content={m.content}
                  className="prose-sm prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-table:my-2 first:[&>*]:mt-0 last:[&>*]:mb-0"
                />
              )
            ) : (
              <p className="whitespace-pre-line">{m.content}</p>
            )}
            {m.role === "assistant" && m.groundedInNote === false && (
              <div className="mt-1.5 flex items-center gap-1 text-xs opacity-75">
                <AlertCircle className="size-3" />
                Not fully covered by this note
              </div>
            )}
            {m.role === "assistant" && !m.isRegenerating && (
              <MessageActions message={m} onRegenerate={onRegenerate} />
            )}
          </div>
        </div>
      ))}
      {isPending && <p className="text-sm text-muted-foreground">Thinking...</p>}
    </div>
  );
}
