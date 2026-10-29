import { Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TaskTypeIcon } from "@/components/tasks/TaskTypeIcon";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { useSubjects } from "@/hooks/useSubjects";
import { EXAM_KINDS, EXAM_KIND_LABELS } from "@/lib/taskMeta";
import type { ExamKind, Task, TaskType } from "@/types";

interface TaskFormDialogProps {
  defaultSubjectId?: string;
  defaultSessionId?: string;
  editingTask?: Task | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}

export function TaskFormDialog({
  defaultSubjectId,
  defaultSessionId,
  editingTask,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger,
}: TaskFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const onOpenChange = onOpenChangeProp ?? setInternalOpen;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("homework");
  const [examKind, setExamKind] = useState<ExamKind>("quiz");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState(defaultSubjectId || "none");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: subjects } = useSubjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(editingTask?.title || "");
    setType(editingTask?.type || "homework");
    setExamKind(editingTask?.examKind || "quiz");
    setDescription(editingTask?.description || "");
    setSubjectId(editingTask?.subjectId || defaultSubjectId || "none");
    setDueDate(editingTask?.dueDate || "");
  }, [open, editingTask, defaultSubjectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const input = {
        title,
        type,
        examKind: type === "exam" ? examKind : null,
        description: description.trim() || null,
        subjectId: subjectId === "none" ? null : subjectId,
        dueDate: dueDate || null,
      };
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, input });
      } else {
        await createTask.mutateAsync({ ...input, sessionId: defaultSessionId || null });
        setTitle("");
        setType("homework");
        setDescription("");
        setDueDate("");
      }
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this task"));
    }
  }

  async function handleDelete() {
    if (!editingTask) return;
    await deleteTask.mutateAsync(editingTask.id);
    onOpenChange(false);
  }

  const isSubmitting = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : openProp === undefined ? (
        <DialogTrigger asChild>
          <Button>
            <Plus /> Add Task
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTask ? "Edit task" : "Add task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as TaskType)}>
            <TabsList className="w-full">
              <TabsTrigger value="homework" className="flex-1">
                Homework
              </TabsTrigger>
              <TabsTrigger value="exam" className="flex-1">
                Exam
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </div>

          {type === "exam" && (
            <div className="space-y-1.5">
              <Label>Exam type</Label>
              <Select value={examKind} onValueChange={(v) => setExamKind(v as ExamKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      <span className="flex items-center gap-2">
                        <TaskTypeIcon task={{ type: "exam", examKind: kind }} size="sm" />
                        {EXAM_KIND_LABELS[kind]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">{type === "exam" ? "Exam date" : "Due date"}</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required={type === "exam"}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Details (optional)</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "exam" ? "Topics to study, chapters, what to bring..." : "Any extra details..."}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="sm:justify-between">
            {editingTask ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete} disabled={deleteTask.isPending}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? "Saving..." : editingTask ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
