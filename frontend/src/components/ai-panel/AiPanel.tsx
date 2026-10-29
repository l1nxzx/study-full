import { PenLine, X } from "lucide-react";
import { useState } from "react";
import { AskView } from "@/components/ai-panel/AskView";
import { FlashcardsTool } from "@/components/ai-panel/tools/FlashcardsTool";
import { NotesRevealToggle } from "@/components/ai-panel/tools/NotesRevealToggle";
import { PracticeTool } from "@/components/ai-panel/tools/PracticeTool";
import { QuizTool } from "@/components/ai-panel/tools/QuizTool";
import { ToolBody } from "@/components/ai-panel/tools/ToolParts";
import { useAiPanel, type AiToolMode } from "@/hooks/useAiPanel";
import { useAiStatus } from "@/hooks/useAiStatus";
import { cn } from "@/lib/utils";

const TABS: { mode: AiToolMode; label: string }[] = [
  { mode: "none", label: "Ask" },
  { mode: "quiz", label: "Quiz" },
  { mode: "flashcards", label: "Flashcards" },
  { mode: "practice", label: "Practice" },
];

const iconButton =
  "flex size-9 shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-tint hover:text-fg lg:size-8";

/**
 * The assistant workspace. On desktop it's a column beside the page (it pushes the content
 * over rather than covering it, so the note stays readable next to it); on phones it takes the
 * whole screen. With a note open it offers four tools as tabs - each with an interface built
 * for its job - and they stay mounted while you switch, so a half-finished quiz isn't lost.
 */
export function AiPanel() {
  const { isOpen, close, toolMode, setToolMode, activeNote, messages, clearMessages } = useAiPanel();
  const aiEnabled = useAiStatus();
  // Tools are mounted the first time they're opened and kept until the note changes. Derived
  // during render (React's "adjusting state when a prop changes" pattern), not in an effect.
  const [visited, setVisited] = useState<{ noteId?: string; modes: Set<AiToolMode> }>({ modes: new Set(["none"]) });
  let nextVisited = visited;
  if (visited.noteId !== activeNote?.id) nextVisited = { noteId: activeNote?.id, modes: new Set(["none"]) };
  if (!nextVisited.modes.has(toolMode)) nextVisited = { ...nextVisited, modes: new Set(nextVisited.modes).add(toolMode) };
  if (nextVisited !== visited) setVisited(nextVisited);

  const mode: AiToolMode = activeNote ? toolMode : "none";
  const showNoteToggle = activeNote && (mode === "quiz" || mode === "practice");

  return (
    <aside
      aria-label="Assistant"
      hidden={!isOpen}
      className={cn(
        // Phones: the whole screen. Mid-size screens: a sheet over the right edge. Wide screens:
        // a column that pushes the page over, so the note stays readable beside it.
        "fixed inset-0 z-50 flex-col bg-panel",
        "lg:left-auto lg:w-[26rem] lg:border-l lg:border-rule lg:shadow-lg",
        "xl:static xl:z-auto xl:h-full xl:shrink-0 xl:shadow-none 2xl:w-[30rem]",
        isOpen ? "flex" : "hidden"
      )}
    >
      <header className="shrink-0 border-b border-rule pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-2 pl-5 pr-3 lg:h-16">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Assistant</p>
            <p className="truncate text-meta text-fg-faint">
              {activeNote ? <>Working from "{activeNote.title}"</> : "General study help"}
            </p>
          </div>
          {mode === "none" && messages.length > 0 && (
            <button type="button" onClick={clearMessages} className={iconButton} title="New conversation" aria-label="New conversation">
              <PenLine className="size-4" />
            </button>
          )}
          <button type="button" onClick={close} className={iconButton} title="Close assistant" aria-label="Close assistant">
            <X className="size-4" />
          </button>
        </div>

        {activeNote && aiEnabled !== false && (
          <div className="flex items-end justify-between gap-2 px-5">
            <div role="tablist" aria-label="Assistant tools" className="-mb-px flex gap-5">
              {TABS.map((tab) => {
                const selected = mode === tab.mode;
                return (
                  <button
                    key={tab.mode}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setToolMode(tab.mode)}
                    className={cn(
                      "h-10 border-b-2 text-sm font-medium transition-colors",
                      selected ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {showNoteToggle && (
              <div className="mb-1.5 hidden lg:block">
                <NotesRevealToggle />
              </div>
            )}
          </div>
        )}
      </header>

      {aiEnabled === false ? (
        <div className="px-5 py-6">
          <p className="text-sm font-medium text-fg">The assistant isn't available</p>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            The server has no OpenAI API key configured, so chat, quizzes, flashcards and practice questions are turned off. Everything
            else works as usual.
          </p>
        </div>
      ) : (
        <>
          <div className={cn("min-h-0 flex-1 flex-col", mode === "none" ? "flex" : "hidden")}>
            <AskView active={isOpen && mode === "none"} />
          </div>

          {activeNote && (
            <>
              {nextVisited.modes.has("quiz") && (
                <ToolBody className={mode === "quiz" ? "block" : "hidden"}>
                  <QuizTool key={activeNote.id} noteId={activeNote.id} noteTitle={activeNote.title} active={isOpen && mode === "quiz"} />
                </ToolBody>
              )}
              {nextVisited.modes.has("flashcards") && (
                <ToolBody className={mode === "flashcards" ? "block" : "hidden"}>
                  <FlashcardsTool
                    key={activeNote.id}
                    noteId={activeNote.id}
                    noteTitle={activeNote.title}
                    active={isOpen && mode === "flashcards"}
                  />
                </ToolBody>
              )}
              {nextVisited.modes.has("practice") && (
                <ToolBody className={mode === "practice" ? "block" : "hidden"}>
                  <PracticeTool key={activeNote.id} noteId={activeNote.id} noteTitle={activeNote.title} />
                </ToolBody>
              )}
            </>
          )}
        </>
      )}
    </aside>
  );
}
