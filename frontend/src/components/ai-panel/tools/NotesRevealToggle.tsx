import { Eye, EyeOff } from "lucide-react";
import { useAiPanel } from "@/hooks/useAiPanel";

// Notes are hidden behind an overlay on the note page while this is off, so quiz/
// practice questions can't just be answered by reading the note underneath.
export function NotesRevealToggle() {
  const { notesRevealed, toggleNotesRevealed } = useAiPanel();

  return (
    <button
      type="button"
      onClick={toggleNotesRevealed}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {notesRevealed ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {notesRevealed ? "Notes visible" : "Notes hidden"}
    </button>
  );
}
