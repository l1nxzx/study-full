import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AiReviewBannerProps {
  alterationCount: number;
  additionCount: number;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  isSaving?: boolean;
}

export function AiReviewBanner({ alterationCount, additionCount, onAcceptAll, onRejectAll, isSaving }: AiReviewBannerProps) {
  if (alterationCount === 0 && additionCount === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2 text-sm text-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-warning" />
        <p>
          {alterationCount > 0 && (
            <>
              The AI corrected {alterationCount} {alterationCount === 1 ? "thing" : "things"} it thought was a
              handwriting error - review the struck-through/highlighted text below.{" "}
            </>
          )}
          {additionCount > 0 && (
            <>
              It also added {additionCount} {additionCount === 1 ? "thing" : "things"} of its own, marked with an
              "AI" badge - those stay marked permanently unless you remove them.
            </>
          )}
        </p>
      </div>
      {alterationCount > 0 && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={onRejectAll} disabled={isSaving}>
            Reject all
          </Button>
          <Button size="sm" onClick={onAcceptAll} disabled={isSaving}>
            Accept all
          </Button>
        </div>
      )}
    </div>
  );
}
