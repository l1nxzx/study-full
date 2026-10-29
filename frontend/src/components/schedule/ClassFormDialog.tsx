import { type FormEvent, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateClass, useDeleteClass, useUpdateClass } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { WEEKDAY_LABELS_FULL } from "@/lib/nav";
import type { ClassEntity, Weekday } from "@/types";

const WEEKDAY_OPTIONS: Weekday[] = [1, 2, 3, 4, 5, 0, 6];

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClass?: ClassEntity | null;
  defaultSubjectId?: string;
}

export function ClassFormDialog({ open, onOpenChange, editingClass, defaultSubjectId }: ClassFormDialogProps) {
  const { data: subjects } = useSubjects();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();

  const [subjectId, setSubjectId] = useState(defaultSubjectId || "");
  const [weekday, setWeekday] = useState<Weekday>(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (editingClass) {
        setSubjectId(editingClass.subjectId);
        setWeekday(editingClass.weekday);
        setStartTime(editingClass.startTime);
        setEndTime(editingClass.endTime);
        setRoom(editingClass.room || "");
        setTeacher(editingClass.teacher || "");
      } else {
        setSubjectId(defaultSubjectId || subjects?.[0]?.id || "");
        setWeekday(1);
        setStartTime("08:00");
        setEndTime("08:45");
        setRoom("");
        setTeacher("");
      }
    }
  }, [open, editingClass, defaultSubjectId, subjects]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const input = { subjectId, weekday, startTime, endTime, room: room || undefined, teacher: teacher || undefined };
    try {
      if (editingClass) {
        await updateClass.mutateAsync({ id: editingClass.id, input });
      } else {
        await createClass.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this class"));
    }
  }

  async function handleDelete() {
    if (!editingClass) return;
    await deleteClass.mutateAsync(editingClass.id);
    onOpenChange(false);
  }

  const isSubmitting = createClass.isPending || updateClass.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingClass ? "Edit class" : "Add class"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Day</Label>
            <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v) as Weekday)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_OPTIONS.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {WEEKDAY_LABELS_FULL[day]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="class-start">Start time</Label>
              <Input id="class-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-end">End time</Label>
              <Input id="class-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="class-room">Room (optional)</Label>
              <Input id="class-room" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-teacher">Teacher (optional)</Label>
              <Input id="class-teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="sm:justify-between">
            {editingClass ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete} disabled={deleteClass.isPending}>
                Delete class
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={!subjectId || isSubmitting}>
              {isSubmitting ? "Saving..." : editingClass ? "Save changes" : "Add class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
