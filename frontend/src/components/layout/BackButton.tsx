import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { backTarget } from "@/lib/navHistory";

/**
 * Back to the page the user came from, named after it. Shown only when there is one to go to.
 * "header": an icon at the left of the phone's top bar. "sidebar": a large icon in the top-right
 * of the sidebar, on screens where the sidebar stays open.
 */
export function BackButton({ variant }: { variant: "header" | "sidebar" }) {
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
      title={`Back to ${target.label}`}
      className="flex size-11 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-tint hover:text-fg active:bg-tint"
    >
      <ArrowLeft className="size-6" strokeWidth={1.75} />
    </button>
  );
}
