import { Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { InlineError } from "@/components/shared/EmptyState";
import { useCreateClassSession } from "@/hooks/useClassSessions";
import { todayISO } from "@/lib/date";

interface ClassSessionFormDialogProps {
  subjectId: string;
  classId?: string | null;
  trigger?: ReactNode;
}

export function ClassSessionFormDialog({ subjectId, classId, trigger }: ClassSessionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createClassSession = useCreateClassSession();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const session = await createClassSession.mutateAsync({ subjectId, classId: classId ?? null, date, title: title || undefined });
      setOpen(false);
      navigate(`/class-sessions/${session.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create class session"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Plus /> New session
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New class session</DialogTitle>
          <DialogDescription>A dated lesson to attach notes and tasks to.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Date" htmlFor="session-date">
            <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Topic (optional)" htmlFor="session-title">
            <Input id="session-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Linear equations" />
          </Field>
          <InlineError>{error}</InlineError>
          <DialogFooter>
            <Button type="submit" disabled={createClassSession.isPending}>
              {createClassSession.isPending ? "Creating..." : "Create session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
