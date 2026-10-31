import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { backTarget } from "@/lib/navHistory";

/** Back to the page the user came from, named after it. Shown only when there is one to go to. */
export function BackButton() {
  const navigate = useNavigate();
  // The page changes with the location, so the control is read again on every change.
  useLocation();
  const target = backTarget();
  if (!target) return null;
  // A bar of its own above the page (not inside the scrolling page), so no page header covers it.
  return (
    <div className="shrink-0 px-5 pt-3 sm:px-8 lg:px-12">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label={`Back to ${target.label}`}
        className="-ml-1 inline-flex h-7 items-center gap-1 rounded-sm px-1 text-[0.8125rem] text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        {target.label}
      </button>
    </div>
  );
}
