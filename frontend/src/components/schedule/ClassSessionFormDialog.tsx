import { Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <Button variant="outline" size="sm">
            <Plus /> New session
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New class session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-date">Date</Label>
            <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-title">Topic (optional)</Label>
            <Input id="session-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Linear Equations" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
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
