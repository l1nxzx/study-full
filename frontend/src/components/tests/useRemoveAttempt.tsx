import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getErrorMessage } from "@/api/client";
import * as testsApi from "@/api/tests";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { clearBackup } from "@/lib/testAttemptBackup";

// Cancels a try that's still open (started by accident, say) or deletes a finished one, after
// asking. Either way the try is gone: its answers, its grade, and its place in the statistics.
// Returns the menu label, a function to ask, and the dialog to render.
export function useRemoveAttempt(attempt: Pick<testsApi.TestAttemptSummary, "id" | "status"> | undefined, onRemoved?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const open = attempt?.status === "in_progress";
  const remove = useMutation({ mutationFn: (id: string) => testsApi.deleteAttempt(id) });

  function confirmRemove() {
    if (!attempt) return;
    remove
      .mutateAsync(attempt.id)
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

  return {
    // A try that's being graded right now can't be removed until grading finishes.
    available: Boolean(attempt) && attempt?.status !== "grading",
    label: open ? "Cancel this try" : "Delete this try",
    ask: () => setConfirm(true),
    dialog: (
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
    ),
  };
}
