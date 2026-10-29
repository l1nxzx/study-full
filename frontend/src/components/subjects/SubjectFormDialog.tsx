import { Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSubject, useDeleteSubject, useSubjects, useUpdateSubject } from "@/hooks/useSubjects";
import { firstUnusedColor, SUBJECT_PALETTE } from "@/lib/scheduleColors";
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
  const deleteSubject = useDeleteSubject();
  const { data: subjects } = useSubjects();
  const navigate = useNavigate();

  const usedColors = (subjects || [])
    .filter((s) => s.id !== editingSubject?.id)
    .map((s) => s.color)
    .filter(Boolean) as string[];

  useEffect(() => {
    if (open) {
      setError(null);
      setName(editingSubject?.name || "");
      setIcon(editingSubject?.icon || "");
      setColor(editingSubject?.color || firstUnusedColor(usedColors));
    }
  }, [open, editingSubject]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingSubject) {
        await updateSubject.mutateAsync({ id: editingSubject.id, input: { name, icon: icon || undefined, color } });
      } else {
        await createSubject.mutateAsync({ name, icon: icon || undefined, color });
      }
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this subject"));
    }
  }

  async function handleDelete() {
    if (!editingSubject) return;
    await deleteSubject.mutateAsync(editingSubject.id);
    onOpenChange(false);
    navigate("/dashboard");
  }

  const isSubmitting = createSubject.isPending || updateSubject.isPending;

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject-name">Name</Label>
            <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" required autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject-icon">Icon (emoji, optional)</Label>
            <Input id="subject-icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📐" maxLength={4} className="w-20" />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_PALETTE.map((c) => {
                const isUsed = usedColors.some((used) => used.toLowerCase() === c.toLowerCase());
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={isUsed ? "Already used by another subject" : undefined}
                    className={cn("relative size-7 rounded-full ring-offset-2 ring-offset-card transition-all", isUsed && color !== c && "opacity-40")}
                    style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                    aria-label={c}
                  />
                );
              })}
            </div>
            {usedColors.some((used) => used.toLowerCase() === color.toLowerCase()) && (
              <p className="text-xs text-muted-foreground">This color is already used by another subject.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="sm:justify-between">
            {editingSubject ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete} disabled={deleteSubject.isPending}>
                Delete subject
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? "Saving..." : editingSubject ? "Save changes" : "Create subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
