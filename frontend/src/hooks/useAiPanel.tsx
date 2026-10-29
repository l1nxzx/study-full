import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";

export type AiToolMode = "none" | "quiz" | "flashcards" | "practice";

export interface AiActiveNote {
  id: string;
  title: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  label?: string; // e.g. "Summary" / "Explanation" - tags quick-action results in the feed
  groundedInNote?: boolean;
  isRegenerating?: boolean;
}

type NewMessage = Omit<AiChatMessage, "id">;

interface AiPanelContextValue {
  isOpen: boolean;
  toolMode: AiToolMode;
  activeNote: AiActiveNote | null;
  notesRevealed: boolean;
  messages: AiChatMessage[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  openWithTool: (mode: AiToolMode) => void;
  setToolMode: (mode: AiToolMode) => void;
  setActiveNote: (note: AiActiveNote | null) => void;
  toggleNotesRevealed: () => void;
  appendMessage: (message: NewMessage) => string;
  updateMessage: (id: string, patch: Partial<NewMessage>) => void;
  clearMessages: () => void;
}

const AiPanelContext = createContext<AiPanelContextValue | null>(null);

export function AiPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [toolMode, setToolModeState] = useState<AiToolMode>("none");
  const [activeNote, setActiveNoteState] = useState<AiActiveNote | null>(null);
  const [notesRevealed, setNotesRevealed] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const idCounter = useRef(0);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const setToolMode = useCallback((mode: AiToolMode) => {
    setToolModeState(mode);
    if (mode === "quiz" || mode === "practice") setNotesRevealed(false);
  }, []);

  const openWithTool = useCallback(
    (mode: AiToolMode) => {
      setToolMode(mode);
      setIsOpen(true);
    },
    [setToolMode]
  );

  // Switching to a different note (or leaving a note entirely) starts a fresh
  // conversation - carrying over chat/quiz state across unrelated notes would be
  // confusing and could leak one note's content into another's context.
  const setActiveNote = useCallback((note: AiActiveNote | null) => {
    setActiveNoteState((prev) => {
      if (prev?.id === note?.id) return prev;
      setMessages([]);
      setToolModeState("none");
      setNotesRevealed(false);
      return note;
    });
  }, []);

  const toggleNotesRevealed = useCallback(() => setNotesRevealed((v) => !v), []);

  const appendMessage = useCallback((message: NewMessage) => {
    const id = `msg-${++idCounter.current}`;
    setMessages((prev) => [...prev, { ...message, id }]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<NewMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  const value = useMemo<AiPanelContextValue>(
    () => ({
      isOpen,
      toolMode,
      activeNote,
      notesRevealed,
      messages,
      open,
      close,
      toggle,
      openWithTool,
      setToolMode,
      setActiveNote,
      toggleNotesRevealed,
      appendMessage,
      updateMessage,
      clearMessages,
    }),
    [
      isOpen,
      toolMode,
      activeNote,
      notesRevealed,
      messages,
      open,
      close,
      toggle,
      openWithTool,
      setToolMode,
      setActiveNote,
      toggleNotesRevealed,
      appendMessage,
      updateMessage,
      clearMessages,
    ]
  );

  return <AiPanelContext value={value}>{children}</AiPanelContext>;
}

export function useAiPanel() {
  const ctx = use(AiPanelContext);
  if (!ctx) throw new Error("useAiPanel must be used within an AiPanelProvider");
  return ctx;
}
