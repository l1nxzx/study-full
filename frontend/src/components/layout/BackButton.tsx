import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { backTarget } from "@/lib/navHistory";

/**
 * Back to the page the user came from, named after it. Shown only when there is one to go to.
 * "header": an icon at the left of the phone's top bar. "corner": a label in the top-left corner
 * of the page, for wide screens where there is no top bar (it takes no height).
 */
export function BackButton({ variant }: { variant: "header" | "corner" }) {
  const navigate = useNavigate();
  // The page changes with the location, so the control is read again on every change.
  useLocation();
  const target = backTarget();
  if (!target) return null;
  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label={`Back to ${target.label}`}
        title={`Back to ${target.label}`}
        className="flex size-10 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-tint hover:text-fg active:bg-tint"
      >
        <ArrowLeft className="size-5" strokeWidth={1.75} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label={`Back to ${target.label}`}
      className="absolute left-3 top-3 z-30 hidden h-7 items-center gap-1 rounded-sm bg-canvas/80 px-1.5 text-[0.8125rem] text-fg-muted backdrop-blur-sm transition-colors hover:text-fg lg:inline-flex"
    >
      <ArrowLeft className="size-3.5" />
      {target.label}
    </button>
  );
}
