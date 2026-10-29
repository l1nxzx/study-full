import { Sparkles } from "lucide-react";
import { useAiPanel } from "@/hooks/useAiPanel";
import { cn } from "@/lib/utils";

// Desktop: a floating corner button. Hidden while the panel itself is open since the
// panel's own header close (X) takes over - avoids a redundant control fighting for
// the same corner of the screen.
export function AiFloatingButton() {
  const { isOpen, open } = useAiPanel();
  if (isOpen) return null;

  return (
    <button
      onClick={open}
      title="Open AI assistant"
      className="fixed right-4 top-4 z-30 hidden size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 lg:flex"
    >
      <Sparkles className="size-4" />
    </button>
  );
}

// Mobile: a small icon slotted into the header bar instead of a floating button, so it
// doesn't collide with the bottom nav or the search field.
export function AiHeaderButton({ className }: { className?: string }) {
  const { isOpen, toggle } = useAiPanel();

  return (
    <button
      onClick={toggle}
      title="AI assistant"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md",
        isOpen ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted",
        className
      )}
    >
      <Sparkles className="size-5" />
    </button>
  );
}
