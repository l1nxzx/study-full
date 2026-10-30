import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { getErrorMessage } from "@/api/client";
import * as testsApi from "@/api/tests";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { clearBackup } from "@/lib/testAttemptBackup";
import { cn } from "@/lib/utils";

// Cancels a try that's still open (started by accident, say) or deletes a finished one. Either
// way the try is gone: its answers, its grade, and its place in the statistics.
export function RemoveAttemptButton({
  attempt,
  onRemoved,
  className,
  compact,
}: {
  attempt: Pick<testsApi.TestAttemptSummary, "id" | "status">;
  onRemoved?: () => void;
  className?: string;
  /** Icon only, for a row in a list. */
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const open = attempt.status === "in_progress";
  const label = open ? "Cancel this try" : "Delete this try";

  const remove = useMutation({ mutationFn: () => testsApi.deleteAttempt(attempt.id) });

  function confirmRemove() {
    remove
      .mutateAsync()
      .then(() => {
        clearBackup(attempt.id);
        setConfirm(false);
        queryClient.removeQueries({ queryKey: ["test-attempts", attempt.id] });
        queryClient.invalidateQueries({ queryKey: ["tests"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        onRemoved?.();
      })
      .catch((err) => {
        setConfirm(false);
        toast({ title: open ? "Couldn't cancel the try" : "Couldn't delete the try", description: getErrorMessage(err, "Please try again."), variant: "destructive" });
      });
  }

  // A try that's being graded right now can't be removed until grading finishes.
  if (attempt.status === "grading") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-sm text-[0.8125rem] text-fg-faint transition-colors hover:text-bad",
          compact && "size-8 justify-center hover:bg-tint",
          className
        )}
      >
        <Trash2 className="size-3.5" />
        {!compact && label}
      </button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={open ? "Cancel this try?" : "Delete this try?"}
        description={
          open
            ? "Your answers so far are deleted. You can start the test again any time."
            : "Its answers and grade are deleted and it no longer counts in your statistics. This can't be undone."
        }
        confirmLabel={open ? "Discard try" : "Delete try"}
        cancelLabel={open ? "Keep it" : "Cancel"}
        onConfirm={confirmRemove}
        isLoading={remove.isPending}
      />
    </>
  );
}
