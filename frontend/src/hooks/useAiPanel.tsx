import { useQueryClient } from "@tanstack/react-query";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as conversationsApi from "@/api/conversations";

export type AiToolMode = "none" | "quiz" | "flashcards";

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
  isError?: boolean; // the request failed - content is the error text, never sent back as history
  createdAt?: string;
}

type NewMessage = Omit<AiChatMessage, "id">;

export type SaveState = "idle" | "saving" | "saved" | "error";

interface AiPanelContextValue {
  isOpen: boolean;
  toolMode: AiToolMode;
  activeNote: AiActiveNote | null;
  notesRevealed: boolean;
  messages: AiChatMessage[];
  conversationId: string | null;
  saveState: SaveState;
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
  loadConversation: (conversation: conversationsApi.Conversation) => void;
}

const AiPanelContext = createContext<AiPanelContextValue | null>(null);

function newMessageId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function toStored(m: AiChatMessage): conversationsApi.StoredChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    ...(m.label ? { label: m.label } : {}),
    ...(m.groundedInNote !== undefined ? { groundedInNote: m.groundedInNote } : {}),
    ...(m.isError ? { isError: true } : {}),
    ...(m.createdAt ? { createdAt: m.createdAt } : {}),
  };
}

export function AiPanelProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [toolMode, setToolModeState] = useState<AiToolMode>("none");
  const [activeNote, setActiveNoteState] = useState<AiActiveNote | null>(null);
  const [notesRevealed, setNotesRevealed] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Conversations are saved as they happen. `generation` changes whenever the conversation
  // is replaced (new note, new conversation, loaded from history) so a save that was still in
  // flight for the old one can't attach itself to the new one.
  const generation = useRef(0);
  const conversationIdRef = useRef<string | null>(null);
  const noteIdRef = useRef<string | null>(null);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());

  const resetConversation = useCallback((nextMessages: AiChatMessage[] = [], nextId: string | null = null) => {
    generation.current += 1;
    conversationIdRef.current = nextId;
    setConversationId(nextId);
    setMessages(nextMessages);
    setSaveState(nextId ? "saved" : "idle");
  }, []);

  useEffect(() => {
    if (messages.length === 0 || messages.some((m) => m.isRegenerating)) return;
    // Only worth keeping once something was actually asked.
    if (!messages.some((m) => m.role === "user")) return;
    const gen = generation.current;
    const snapshot = messages.map(toStored);
    const noteId = noteIdRef.current;
    const timer = setTimeout(() => {
      setSaveState("saving");
      saveChain.current = saveChain.current
        .catch(() => undefined)
        .then(async () => {
          if (gen !== generation.current) return;
          const id = conversationIdRef.current;
          if (id) {
            await conversationsApi.updateConversation(id, snapshot);
          } else {
            const created = await conversationsApi.createConversation({ noteId, messages: snapshot });
            if (gen !== generation.current) return;
            conversationIdRef.current = created.id;
            setConversationId(created.id);
          }
          if (gen === generation.current) setSaveState("saved");
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        })
        .catch(() => {
          if (gen === generation.current) setSaveState("error");
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [messages, queryClient]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const setToolMode = useCallback((mode: AiToolMode) => {
    setToolModeState(mode);
    if (mode === "quiz") setNotesRevealed(false);
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
  // confusing and could leak one note's content into another's context. The previous
  // conversation is already saved and can be reopened from history.
  const setActiveNote = useCallback(
    (note: AiActiveNote | null) => {
      setActiveNoteState((prev) => {
        if (prev?.id === note?.id) return note && prev && prev.title !== note.title ? note : prev;
        noteIdRef.current = note?.id ?? null;
        resetConversation();
        setToolModeState("none");
        setNotesRevealed(false);
        return note;
      });
    },
    [resetConversation]
  );

  const toggleNotesRevealed = useCallback(() => setNotesRevealed((v) => !v), []);

  const appendMessage = useCallback((message: NewMessage) => {
    const id = newMessageId();
    setMessages((prev) => [...prev, { createdAt: new Date().toISOString(), ...message, id }]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<NewMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const clearMessages = useCallback(() => resetConversation(), [resetConversation]);

  const loadConversation = useCallback(
    (conversation: conversationsApi.Conversation) => {
      resetConversation(
        conversation.messages.map((m) => ({ ...m })),
        conversation.id
      );
    },
    [resetConversation]
  );

  const value = useMemo<AiPanelContextValue>(
    () => ({
      isOpen,
      toolMode,
      activeNote,
      notesRevealed,
      messages,
      conversationId,
      saveState,
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
      loadConversation,
    }),
    [
      isOpen,
      toolMode,
      activeNote,
      notesRevealed,
      messages,
      conversationId,
      saveState,
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
      loadConversation,
    ]
  );

  return <AiPanelContext value={value}>{children}</AiPanelContext>;
}

export function useAiPanel() {
  const ctx = use(AiPanelContext);
  if (!ctx) throw new Error("useAiPanel must be used within an AiPanelProvider");
  return ctx;
}
