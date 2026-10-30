import { useState } from "react";
import { getErrorMessage } from "@/api/client";
import { InlineError } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNotes } from "@/hooks/useNotes";
import { useDeleteSubject } from "@/hooks/useSubjects";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types";

function Choice({ selected, onSelect, title, detail }: { selected: boolean; onSelect: () => void; title: string; detail: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors",
        selected ? "border-accent bg-tint/60" : "border-rule hover:border-rule-strong"
      )}
    >
      <span className={cn("mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full border", selected ? "border-accent" : "border-rule-strong")}>
        {selected && <span className="size-1.5 rounded-full bg-accent" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="mt-0.5 block text-[0.8125rem] text-fg-muted">{detail}</span>
      </span>
    </button>
  );
}

// Asks before deleting a subject, and what should happen to its notes: kept (without a
// subject) or deleted too. Its classes go with it; tasks and tests stay without a subject.
export function DeleteSubjectDialog({
  subject,
  open,
  onOpenChange,
  onDeleted,
}: {
  subject: Subject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { data: notes, isPending: notesPending } = useNotes({ subjectId: subject.id }, { enabled: open });
  const [deleteNotes, setDeleteNotes] = useState(false);
  const remove = useDeleteSubject();
  const count = notes?.length ?? 0;
  const noteWord = count === 1 ? "note" : "notes";

  function confirm() {
    remove
      .mutateAsync({ id: subject.id, deleteNotes: count > 0 && deleteNotes })
      .then(() => {
        onOpenChange(false);
        onDeleted();
      })
      .catch(() => undefined);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !remove.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader className="pr-0">
          <DialogTitle>Delete "{subject.name}"?</DialogTitle>
          <DialogDescription>Its classes are removed from the timetable. Its tasks and tests stay, without a subject.</DialogDescription>
        </DialogHeader>

        {notesPending ? (
          <p className="text-sm text-fg-faint">Counting its notes...</p>
        ) : count > 0 ? (
          <div role="radiogroup" aria-label="Its notes" className="space-y-2">
            <Choice
              selected={!deleteNotes}
              onSelect={() => setDeleteNotes(false)}
              title={`Keep its ${count} ${noteWord}`}
              detail="They stay in Notes, without a subject. You can give them another subject any time."
            />
            <Choice
              selected={deleteNotes}
              onSelect={() => setDeleteNotes(true)}
              title={`Delete its ${count} ${noteWord} too`}
              detail="Deleted for good, with their attachments."
            />
          </div>
        ) : (
          <p className="text-sm text-fg-muted">It has no notes.</p>
        )}

        <InlineError>{remove.error ? getErrorMessage(remove.error, "Couldn't delete the subject") : null}</InlineError>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending || notesPending}>
            {remove.isPending ? "Deleting..." : count > 0 && deleteNotes ? "Delete subject and notes" : "Delete subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
