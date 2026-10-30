import { Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { InlineError } from "@/components/shared/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
            <Plus /> Add task
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTask ? "Edit task" : "Add task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Segmented
            label="Kind"
            value={type}
            onChange={setType}
            options={[
              { value: "homework", label: "Homework" },
              { value: "exam", label: "Exam" },
            ]}
            className="w-full"
          />

          <Field label="Title" htmlFor="task-title">
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </Field>

          {type === "exam" && (
            <Field label="Exam type">
              <Select value={examKind} onValueChange={(v) => setExamKind(v as ExamKind)}>
                <SelectTrigger aria-label="Exam type">
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
            </Field>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Subject">
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger aria-label="Subject">
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
            </Field>
            <Field label={type === "exam" ? "Exam date" : "Due date"} htmlFor="task-due">
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required={type === "exam"} />
            </Field>
          </div>

          <Field label="Details (optional)" htmlFor="task-description">
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "exam" ? "Topics to study, chapters, what to bring..." : "Any extra details..."}
              rows={3}
            />
          </Field>

          <InlineError>{error}</InlineError>

          <DialogFooter className="sm:justify-between">
            {editingTask ? (
              <Button type="button" variant="ghost" className="text-bad hover:bg-bad/10 hover:text-bad" onClick={handleDelete} disabled={deleteTask.isPending}>
                Delete
              </Button>
            ) : (
              <span className="hidden sm:block" />
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
