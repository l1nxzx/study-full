import { useMutation } from "@tanstack/react-query";
import { HelpCircle, Layers, Send, Sparkles, SquareStack, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useLocation } from "react-router-dom";
import * as aiApi from "@/api/ai";
import { getErrorMessage } from "@/api/client";
import { ChatMessages } from "@/components/ai-panel/ChatMessages";
import { FlashcardsTool } from "@/components/ai-panel/tools/FlashcardsTool";
import { PracticeTool } from "@/components/ai-panel/tools/PracticeTool";
import { QuizTool } from "@/components/ai-panel/tools/QuizTool";
import { Button } from "@/components/ui/button";
import { chatHintFor, useAiContextSummary } from "@/hooks/useAiContext";
import { useAiPanel, type AiToolMode } from "@/hooks/useAiPanel";
import { useAiStatus } from "@/hooks/useAiStatus";
import { cn } from "@/lib/utils";

const QUICK_TOOLS: { mode: AiToolMode; label: string; icon: typeof Sparkles }[] = [
  { mode: "quiz", label: "Quiz", icon: SquareStack },
  { mode: "flashcards", label: "Flashcards", icon: Layers },
  { mode: "practice", label: "Practice", icon: Sparkles },
];

function historyFor(messages: ReturnType<typeof useAiPanel>["messages"], excludeId?: string) {
  return messages
    .filter((m) => !m.label && m.id !== excludeId)
    .map((m) => ({ role: m.role, content: m.content }));
}

export function AiPanel() {
  const { isOpen, close, toolMode, setToolMode, activeNote, messages, appendMessage, updateMessage } = useAiPanel();
  const aiEnabled = useAiStatus();
  const [input, setInput] = useState("");
  const contextSummary = useAiContextSummary(isOpen && !activeNote && aiEnabled);
  const location = useLocation();

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
      };
      if (regenerateId) updateMessage(regenerateId, patch);
      else appendMessage({ role: "assistant", ...patch });
    },
    onError: (err, variables) => {
      const content = getErrorMessage(err, "Could not get an answer");
      if (variables.regenerateId) updateMessage(variables.regenerateId, { content, isRegenerating: false });
      else appendMessage({ role: "assistant", content });
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
      if (regenerateId) updateMessage(regenerateId, { content, isRegenerating: false });
      else appendMessage({ role: "assistant", label: "Summary", content });
    },
    onError: (err, variables) => {
      const content = getErrorMessage(err, "Could not summarize this note");
      if (variables?.regenerateId) updateMessage(variables.regenerateId, { content, isRegenerating: false });
      else appendMessage({ role: "assistant", label: "Summary", content });
    },
  });

  const explainMutation = useMutation({
    mutationFn: async ({ text, forceRefresh, regenerateId }: { text: string; forceRefresh?: boolean; regenerateId?: string }) => {
      const result = await aiApi.getExplanation(activeNote!.id, text, "simple", forceRefresh);
      return { result, regenerateId };
    },
    onSuccess: ({ result, regenerateId }) => {
      if (regenerateId) updateMessage(regenerateId, { content: result.explanation, isRegenerating: false });
      else appendMessage({ role: "assistant", label: "Explanation", content: result.explanation });
    },
    onError: (err, variables) => {
      const content = getErrorMessage(err, "Could not explain this");
      if (variables.regenerateId) updateMessage(variables.regenerateId, { content, isRegenerating: false });
      else appendMessage({ role: "assistant", label: "Explanation", content });
    },
  });

  const isPending = askMutation.isPending || summaryMutation.isPending || explainMutation.isPending;
  const isSplit = toolMode !== "none" && Boolean(activeNote);

  function handleSummaryClick() {
    if (!activeNote) return;
    appendMessage({ role: "user", label: "Summary", content: "Summarize this note" });
    summaryMutation.mutate({});
  }

  function handleExplainClick() {
    if (!activeNote) return;
    const selection = window.getSelection()?.toString().trim();
    if (!selection) {
      appendMessage({
        role: "assistant",
        label: "Explain",
        content: "Select some text in the note first, then click Explain.",
      });
      return;
    }
    appendMessage({ role: "user", label: "Explain", content: `"${selection}"` });
    explainMutation.mutate({ text: selection });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isPending) return;
    appendMessage({ role: "user", content: question });
    setInput("");
    askMutation.mutate({ question });
  }

  // Regenerating replaces the assistant message in place, driven by whatever produced
  // it: the preceding user message tells us whether it was a Summary/Explain quick
  // action or a normal question.
  function handleRegenerate(id: string) {
    const index = messages.findIndex((m) => m.id === id);
    if (index < 1) return;
    const assistantMessage = messages[index];
    const userMessage = messages[index - 1];
    if (userMessage.role !== "user") return;

    updateMessage(id, { isRegenerating: true });

    if (assistantMessage.label === "Summary" && activeNote) {
      summaryMutation.mutate({ forceRefresh: true, regenerateId: id });
    } else if (assistantMessage.label === "Explanation" && activeNote) {
      const text = userMessage.content.replace(/^"|"$/g, "");
      explainMutation.mutate({ text, forceRefresh: true, regenerateId: id });
    } else if (!assistantMessage.label) {
      askMutation.mutate({ question: userMessage.content, regenerateId: id });
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        // Mobile: full-screen overlay (no room to push). Desktop (lg+): a normal flex
        // sibling of the main content column, so it pushes/shrinks that column instead
        // of covering it - closing it restores the content to full width.
        "fixed inset-0 z-40 flex flex-col bg-card lg:static lg:inset-auto lg:z-auto lg:h-full lg:shrink-0 lg:flex-row lg:border-l lg:border-border",
        isSplit ? "lg:w-[880px]" : "lg:w-[420px]"
      )}
    >
      {isSplit && activeNote && (
        <div className="flex flex-col border-b border-border lg:w-1/2 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-end px-3 py-2">
            <button
              onClick={() => setToolMode("none")}
              title="Close"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-[42vh] overflow-y-auto px-4 pb-4 lg:max-h-none lg:flex-1">
            {toolMode === "quiz" && <QuizTool noteId={activeNote.id} />}
            {toolMode === "flashcards" && <FlashcardsTool noteId={activeNote.id} />}
            {toolMode === "practice" && <PracticeTool noteId={activeNote.id} />}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{activeNote ? activeNote.title : "AI Assistant"}</p>
            <p className="truncate text-xs text-muted-foreground">{activeNote ? "Based on this note" : "General study chat"}</p>
          </div>
          <button onClick={close} className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {activeNote && aiEnabled && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
            <Button size="sm" variant="outline" onClick={handleSummaryClick} disabled={summaryMutation.isPending}>
              <Sparkles /> Summary
            </Button>
            <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={handleExplainClick} disabled={explainMutation.isPending}>
              <HelpCircle /> Explain
            </Button>
            {QUICK_TOOLS.map((tool) => (
              <Button
                key={tool.mode}
                size="sm"
                variant={toolMode === tool.mode ? "default" : "outline"}
                onClick={() => setToolMode(toolMode === tool.mode ? "none" : tool.mode)}
              >
                <tool.icon /> {tool.label}
              </Button>
            ))}
          </div>
        )}

        {!aiEnabled ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            AI features are unavailable - the backend has no OpenAI API key configured.
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {activeNote ? `Ask anything about "${activeNote.title}", or use a quick action above.` : chatHintFor(location.pathname)}
                </p>
              ) : (
                <ChatMessages messages={messages} isPending={isPending} onRegenerate={handleRegenerate} />
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeNote ? "Ask about this note..." : "Ask anything..."}
                className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isPending}>
                <Send className="size-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
