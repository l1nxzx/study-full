import { Eye, EyeOff } from "lucide-react";
import { useAiPanel } from "@/hooks/useAiPanel";

// Notes are hidden behind an overlay on the note page while this is off, so quiz
// questions can't just be answered by reading the note underneath.
export function NotesRevealToggle() {
  const { notesRevealed, toggleNotesRevealed } = useAiPanel();

  return (
    <button
      type="button"
      onClick={toggleNotesRevealed}
      aria-pressed={notesRevealed}
      title={notesRevealed ? "Hide the note while you answer" : "Show the note"}
      className="inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 text-meta text-fg-muted transition-colors hover:bg-tint hover:text-fg"
    >
      {notesRevealed ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {notesRevealed ? "Note visible" : "Note hidden"}
    </button>
  );
}
