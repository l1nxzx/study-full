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
    <div className="mb-8 flex flex-col gap-3 border-l-2 border-warn py-1 pl-4 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}
