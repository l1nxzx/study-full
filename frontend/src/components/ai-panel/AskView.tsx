import { useMutation } from "@tanstack/react-query";
import { ArrowRight, FileText, History, PenLine, TextSelect } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { ChatMessages } from "@/components/ai-panel/ChatMessages";
import { ConversationHistory } from "@/components/ai-panel/ConversationHistory";
import { Composer } from "@/components/ai-panel/Composer";
import { chatHintFor, useAiContextSummary } from "@/hooks/useAiContext";
import { useAiPanel, type AiChatMessage } from "@/hooks/useAiPanel";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useCloseOnBack } from "@/lib/closeOnBack";

function historyFor(messages: AiChatMessage[], excludeId?: string) {
  return messages
    .filter((m) => !m.label && !m.isError && m.id !== excludeId)
    .map((m) => ({ role: m.role, content: m.content }));
}

const GENERAL_SUGGESTIONS = ["What's due this week?", "What does my next school day look like?", "Help me plan revision for my next exam"];
const NOTE_SUGGESTIONS = ["What are the key ideas I need to remember?", "What would a test on this probably ask?", "Give me a worked example"];

const quickActionButton =
  "inline-flex h-7 items-center gap-1.5 rounded-md border border-rule px-2.5 text-meta text-fg-muted transition-colors hover:border-rule-strong hover:text-fg disabled:opacity-45";

/** The conversation: a general study chat, or questions answered from the open note. */
export function AskView({ active }: { active: boolean }) {
  const { isOpen, activeNote, messages, appendMessage, updateMessage, clearMessages, saveState } = useAiPanel();
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  // Back from the list of past chats returns to the chat (while the assistant covers the page).
  const docked = useMediaQuery("(min-width: 1280px)");
  useCloseOnBack(isOpen && showHistory && !docked, () => setShowHistory(false));
  // Reopening the assistant shows the chat, not a list left open last time.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setShowHistory(false);
  }
  const contextSummary = useAiContextSummary(isOpen && !activeNote);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: async ({ question, regenerateId }: { question: string; regenerateId?: string }) => {
      const history = historyFor(messages, regenerateId);
      const result = activeNote
        ? await aiApi.askNote(activeNote.id, question, history)
        : await aiApi.chat(question, history, contextSummary);
      return { result, regenerateId };
    },
    onSuccess: ({ result, regenerateId }: { result: aiApi.AskResult | aiApi.ChatResult; regenerateId?: string }) => {
      const patch = {
        content: result.answer,
        groundedInNote: "groundedInNote" in result ? (result as aiApi.AskResult).groundedInNote : undefined,
        isRegenerating: false,
        isError: false,
      };
      if (regenerateId) updateMessage(regenerateId, patch);
      else appendMessage({ role: "assistant", ...patch });
    },
    onError: (err, variables) => {
      const content = getErrorMessage(err, "Could not get an answer");
      if (variables.regenerateId) updateMessage(variables.regenerateId, { content, isRegenerating: false, isError: true });
      else appendMessage({ role: "assistant", content, isError: true });
    },
  });

  const summaryMutation = useMutation({
    mutationFn: async ({ forceRefresh, regenerateId }: { forceRefresh?: boolean; regenerateId?: string } = {}) => {
      const result = await aiApi.getSummary(activeNote!.id, forceRefresh);
      return { result, regenerateId };
    },
    onSuccess: ({ result, regenerateId }) => {
      const points = result.keyPoints.map((p) => `- ${p}`).join("\n");
      const content = `### Quick Summary\n\n${result.quickSummary}\n\n### Key Points\n\n${points}`;
      if (regenerateId) updateMessage(regenerateId, { content, isRegenerating: false, isError: false });
      else appendMessage({ role: "assistant", label: "Summary", content });
    },
    onError: (err, variables) => {
      const content = getErrorMessage(err, "Could not summarize this note");
      if (variables?.regenerateId) updateMessage(variables.regenerateId, { content, isRegenerating: false, isError: true });
      else appendMessage({ role: "assistant", label: "Summary", content, isError: true });
    },
  });

  const explainMutation = useMutation({
    mutationFn: async ({ text, forceRefresh, regenerateId }: { text: string; forceRefresh?: boolean; regenerateId?: string }) => {
      const result = await aiApi.getExplanation(activeNote!.id, text, "simple", forceRefresh);
      return { result, regenerateId };
    },
    onSuccess: ({ result, regenerateId }) => {
      if (regenerateId) updateMessage(regenerateId, { content: result.explanation, isRegenerating: false, isError: false });
      else appendMessage({ role: "assistant", label: "Explanation", content: result.explanation });
    },
    onError: (err, variables) => {
      const content = getErrorMessage(err, "Could not explain this");
      if (variables.regenerateId) updateMessage(variables.regenerateId, { content, isRegenerating: false, isError: true });
      else appendMessage({ role: "assistant", label: "Explanation", content, isError: true });
    },
  });

  const isPending = askMutation.isPending || summaryMutation.isPending || explainMutation.isPending;
  const isRegenerating = messages.some((m) => m.isRegenerating);
  // A regenerate shows its own placeholder in place; only new answers get the trailing one.
  const showPendingTail = isPending && !isRegenerating;

  // Keep the newest exchange in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, showPendingTail]);

  function handleSummaryClick() {
    if (!activeNote || isPending) return;
    appendMessage({ role: "user", label: "Summary", content: "Summarize this note" });
    summaryMutation.mutate({});
  }

  function handleExplainClick() {
    if (!activeNote || isPending) return;
    const selection = window.getSelection()?.toString().trim();
    if (!selection) {
      appendMessage({
        role: "assistant",
        label: "Explain",
        content: "Select a passage in the note first, then choose **Explain selection**.",
      });
      return;
    }
    appendMessage({ role: "user", label: "Explain", content: `"${selection}"` });
    explainMutation.mutate({ text: selection });
  }

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isPending) return;
    appendMessage({ role: "user", content: trimmed });
    setInput("");
    askMutation.mutate({ question: trimmed });
  }

  // Regenerating replaces the assistant message in place, driven by whatever produced
  // it: the preceding user message tells us whether it was a Summary/Explain quick
  // action or a normal question.
  function handleRegenerate(id: string) {
    if (isPending) return;
    const index = messages.findIndex((m) => m.id === id);
    if (index < 1) return;
    const assistantMessage = messages[index];
    const userMessage = messages[index - 1];
    if (userMessage.role !== "user") return;

    if (assistantMessage.label === "Summary" && activeNote) {
      updateMessage(id, { isRegenerating: true });
      summaryMutation.mutate({ forceRefresh: true, regenerateId: id });
    } else if (assistantMessage.label === "Explanation" && activeNote) {
      updateMessage(id, { isRegenerating: true });
      const text = userMessage.content.replace(/^"|"$/g, "");
      explainMutation.mutate({ text, forceRefresh: true, regenerateId: id });
    } else if (!assistantMessage.label) {
      updateMessage(id, { isRegenerating: true });
      askMutation.mutate({ question: userMessage.content, regenerateId: id });
    }
  }

  const suggestions = activeNote ? NOTE_SUGGESTIONS : GENERAL_SUGGESTIONS;

  const toolbarButton =
    "flex size-8 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-tint hover:text-fg disabled:opacity-40";

  if (showHistory) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ConversationHistory onClose={() => setShowHistory(false)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 px-3.5">
        {/* Only say something about saving when it isn't simply saved. */}
        <p className={cn("truncate pl-1.5 text-meta", saveState === "error" ? "text-warn" : "text-fg-faint")}>
          {messages.length > 0 && saveState === "saving" ? "Saving..." : messages.length > 0 && saveState === "error" ? "Not saved yet - will retry" : ""}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={() => setShowHistory(true)} className={toolbarButton} aria-label="Past chats" title="Past chats">
            <History className="size-4" />
          </button>
          <button type="button" onClick={clearMessages} className={toolbarButton} disabled={isPending || messages.length === 0} aria-label="New chat" title="New chat">
            <PenLine className="size-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col justify-end pb-2">
            <p className="font-serif text-[1.1875rem] font-medium leading-snug text-fg">
              {activeNote ? <>What would you like to know about "{activeNote.title}"?</> : "What can I help you with?"}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              {activeNote
                ? "Ask anything, including what the note assumes you already know."
                : `${chatHintFor(location.pathname)} I can see your subjects, timetable, tasks and note titles.`}
            </p>
            <ul className="mt-6 space-y-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => ask(s)}
                    disabled={isPending}
                    className="group flex w-full items-center gap-3 rounded-lg border border-rule px-3.5 py-2.5 text-left text-[0.9375rem] text-fg-muted transition-colors hover:border-rule-strong hover:bg-tint/50 hover:text-fg"
                  >
                    <span className="flex-1">{s}</span>
                    <ArrowRight className="size-3.5 text-fg-faint transition-colors group-hover:text-fg" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            isPending={showPendingTail}
            sourceTitle={activeNote?.title}
            onRegenerate={isPending ? undefined : handleRegenerate}
          />
        )}
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSubmit={() => ask(input)}
        disabled={isPending}
        placeholder={activeNote ? "Ask about this note" : "Ask anything about your studies"}
        autoFocusKey={active && isOpen ? activeNote?.id ?? "general" : undefined}
        actions={
          activeNote && (
            <>
              <button type="button" onClick={handleSummaryClick} disabled={isPending} className={quickActionButton}>
                <FileText className="size-3.5" />
                Summarize
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleExplainClick}
                disabled={isPending}
                className={quickActionButton}
                title="Select a passage in the note, then press this"
              >
                <TextSelect className="size-3.5" />
                Explain selection
              </button>
            </>
          )
        }
      />
    </div>
  );
}
