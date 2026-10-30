import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/usePreferences";

export const REVIEW_BANNER_TIP = "ai-review-banner";

interface AiReviewBannerProps {
  alterationCount: number;
  additionCount: number;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  isSaving?: boolean;
}

// Explains the transcription markers once. Closing it hides it for good (saved to the account,
// so it stays hidden on every device); the markers keep their own inline controls.
export function AiReviewBanner({ alterationCount, additionCount, onAcceptAll, onRejectAll, isSaving }: AiReviewBannerProps) {
  const { isTipDismissed, dismissTip } = usePreferences();
  if (alterationCount === 0 && additionCount === 0) return null;
  if (isTipDismissed(REVIEW_BANNER_TIP)) return null;

  return (
    <div className="relative mb-8 flex flex-col gap-3 border-l-2 border-warn py-1 pl-4 pr-10 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm leading-relaxed">
        <p className="font-medium text-fg">Review the transcription</p>
        <p className="text-fg-muted">
          {alterationCount > 0 && (
            <>
              {alterationCount} {alterationCount === 1 ? "word was" : "words were"} corrected where the handwriting looked wrong
              (struck through, with the correction beside it).{" "}
            </>
          )}
          {additionCount > 0 && (
            <>
              {additionCount} {additionCount === 1 ? "passage was" : "passages were"} added by the AI and stay marked "AI" unless you
              remove them.
            </>
          )}
        </p>
      </div>
      {alterationCount > 0 && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={onRejectAll} disabled={isSaving}>
            Keep originals
          </Button>
          <Button size="sm" variant="outline" onClick={onAcceptAll} disabled={isSaving}>
            Accept all
          </Button>
        </div>
      )}
      <button
        type="button"
        onClick={() => dismissTip(REVIEW_BANNER_TIP)}
        title="Don't show this again"
        aria-label="Close and don't show again"
        className="absolute right-0 top-0 flex size-8 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-tint hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
