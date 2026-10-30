import { Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { InlineError } from "@/components/shared/EmptyState";
import { useCreateSubject, useSubjects, useUpdateSubject } from "@/hooks/useSubjects";
import { DeleteSubjectDialog } from "./DeleteSubjectDialog";
import { SWATCH_TONE } from "@/components/shared/SubjectSwatch";
import { firstUnusedColor, SUBJECT_PALETTE, subjectColor } from "@/lib/scheduleColors";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types";

interface SubjectFormDialogProps {
  editingSubject?: Subject | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}

export function SubjectFormDialog({ editingSubject, open: openProp, onOpenChange: onOpenChangeProp, trigger }: SubjectFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const onOpenChange = onOpenChangeProp ?? setInternalOpen;

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState(SUBJECT_PALETTE[0]);
  const [error, setError] = useState<string | null>(null);

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: subjects } = useSubjects();
  const navigate = useNavigate();

  const usedColors = (subjects || [])
    .filter((s) => s.id !== editingSubject?.id)
    .map((s) => subjectColor(s.color))
    .filter(Boolean) as string[];

  useEffect(() => {
    if (open) {
      setError(null);
      setName(editingSubject?.name || "");
      setIcon(editingSubject?.icon || "");
      setColor(subjectColor(editingSubject?.color) || firstUnusedColor(usedColors));
    }
  }, [open, editingSubject]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingSubject) {
        // Shown at once; a failure puts the old name and colour back and says so.
        updateSubject.mutate({ id: editingSubject.id, input: { name, icon: icon || undefined, color } });
      } else {
        await createSubject.mutateAsync({ name, icon: icon || undefined, color });
      }
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this subject"));
    }
  }


  const isSubmitting = createSubject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : openProp === undefined ? (
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost">
            <Plus /> New subject
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingSubject ? "Edit subject" : "New subject"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Name" htmlFor="subject-name">
            <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" required autoFocus />
          </Field>

          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-fg-muted">Colour</p>
            <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-1.5">
              {SUBJECT_PALETTE.map((c) => {
                const isUsed = usedColors.some((used) => used.toLowerCase() === c.toLowerCase());
                const selected = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setColor(c)}
                    title={isUsed ? "Already used by another subject" : undefined}
                    aria-label={c}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-sm border transition-colors",
                      selected ? "border-fg-muted" : "border-transparent hover:border-rule-strong"
                    )}
                  >
                    <span className={cn("size-5 rounded-xs", SWATCH_TONE, isUsed && !selected && "opacity-35")} style={{ backgroundColor: c }} />
                  </button>
                );
              })}
            </div>
            <p className="text-meta text-fg-faint">
              {usedColors.some((used) => used.toLowerCase() === color.toLowerCase())
                ? "This colour is already used by another subject."
                : "Shown as a small square next to the subject everywhere."}
            </p>
          </div>

          <Field label="Icon (optional)" htmlFor="subject-icon" hint="A single emoji, shown on the subject's page.">
            <Input id="subject-icon" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="w-20" />
          </Field>

          <InlineError>{error}</InlineError>

          <DialogFooter className="sm:justify-between">
            {editingSubject ? (
              <Button type="button" variant="ghost" className="text-bad hover:bg-bad/10 hover:text-bad" onClick={() => setConfirmDelete(true)}>
                Delete subject
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? "Saving..." : editingSubject ? "Save changes" : "Create subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {editingSubject && (
        <DeleteSubjectDialog
          subject={editingSubject}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onDeleted={() => {
            onOpenChange(false);
            navigate("/dashboard");
          }}
        />
      )}
    </Dialog>
  );
}
