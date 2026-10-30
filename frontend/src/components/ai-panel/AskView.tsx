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

function historyFor(messages: AiChatMessage[], excludeId?: string) {
  return messages
    .filter((m) => !m.label && !m.isError && m.id !== excludeId)
    .map((m) => ({ role: m.role, content: m.content }));
}

const GENERAL_SUGGESTIONS = ["What's due this week?", "What does my next school day look like?", "Help me plan revision for my next exam"];
const NOTE_SUGGESTIONS = ["What are the key ideas I need to remember?", "What would a test on this probably ask?", "Give me a worked example"];

const quickActionButton =
  "inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 text-meta text-fg-muted transition-colors hover:bg-tint hover:text-fg disabled:opacity-45";

/** The conversation: a general study chat, or questions answered from the open note. */
export function AskView({ active }: { active: boolean }) {
  const { isOpen, activeNote, messages, appendMessage, updateMessage, clearMessages, saveState } = useAiPanel();
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
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
    "inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 text-meta text-fg-muted transition-colors hover:bg-tint hover:text-fg";

  if (showHistory) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ConversationHistory onClose={() => setShowHistory(false)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-rule px-3.5">
        <p className="truncate pl-1.5 text-meta text-fg-faint">
          {messages.length === 0
            ? "New conversation"
            : saveState === "saving"
              ? "Saving..."
              : saveState === "error"
                ? "Not saved - will retry with the next message"
                : saveState === "saved"
                  ? "Saved"
                  : ""}
        </p>
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={() => setShowHistory(true)} className={toolbarButton}>
            <History className="size-3.5" /> History
          </button>
          {messages.length > 0 && (
            <button type="button" onClick={clearMessages} className={toolbarButton} disabled={isPending}>
              <PenLine className="size-3.5" /> New
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <div>
            <p className="text-sm leading-relaxed text-fg-muted">
              {activeNote ? (
                <>
                  Ask anything about <span className="text-fg">"{activeNote.title}"</span>, including things the note assumes you
                  already know. Answers that go beyond the note say so underneath.
                </>
              ) : (
                <>{chatHintFor(location.pathname)} I can see your subjects, timetable, open tasks and note titles - not the notes themselves.</>
              )}
            </p>
            <p className="group-label mb-1 mt-7">Try asking</p>
            <ul className="divide-y divide-rule border-y border-rule">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => ask(s)}
                    disabled={isPending}
                    className="group flex w-full items-center gap-3 py-2.5 text-left text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    <span className="flex-1">{s}</span>
                    <ArrowRight className="size-3.5 text-fg-faint opacity-0 transition-opacity group-hover:opacity-100" />
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
