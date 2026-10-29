import { CheckSquare } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useSubjects } from "@/hooks/useSubjects";
import { groupChronologically } from "@/lib/taskGroups";
import { cn } from "@/lib/utils";
import type { Subject, Task, TaskType } from "@/types";

function TaskList({ tasks, subjectById, overdue, emptyLabel }: {
  tasks: Task[];
  subjectById: Map<string, Subject>;
  overdue?: boolean;
  emptyLabel: string;
}) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  if (tasks.length === 0) {
    return <p className="py-3 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="divide-y divide-border">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          subject={task.subjectId ? subjectById.get(task.subjectId) : undefined}
          overdue={overdue}
          onToggle={(completed) => updateTask.mutate({ id: task.id, input: { completed } })}
          onDelete={() => deleteTask.mutate(task.id)}
        />
      ))}
    </div>
  );
}

export function TasksPage() {
  const { data: tasks, isLoading } = useTasks();
  const { data: subjects } = useSubjects();
  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const subjectById = new Map((subjects || []).map((s) => [s.id, s]));

  const filtered = (tasks || []).filter(
    (t) => (typeFilter === "all" || t.type === typeFilter) && (subjectFilter === "all" || t.subjectId === subjectFilter)
  );

  const groups = groupChronologically(filtered);
  const openCount = groups.reduce((sum, g) => sum + g.tasks.length, 0);
  const completed = filtered.filter((t) => t.completed);

  return (
    <div>
      <PageHeader title="Tasks" description="Homework, exams, and everything due." actions={<TaskFormDialog />} />

      {!isLoading && (tasks || []).length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | TaskType)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="homework">Homework</SelectItem>
              <SelectItem value="exam">Exams</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && tasks?.length === 0 && (
        <EmptyState icon={CheckSquare} title="You're all caught up" description="No tasks yet." action={<TaskFormDialog />} />
      )}

      {!isLoading && tasks && tasks.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs defaultValue="open">
              <TabsList>
                <TabsTrigger value="open">Open {openCount > 0 && `(${openCount})`}</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="space-y-5">
                {openCount === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nothing open — you&apos;re all caught up.</p>}
                {groups.map((group) => (
                  <div key={group.label}>
                    <p
                      className={cn(
                        "mb-1 text-xs font-semibold uppercase tracking-wide",
                        group.emphasis === "overdue" ? "text-destructive" : group.emphasis === "tomorrow" ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {group.label}
                    </p>
                    <TaskList tasks={group.tasks} subjectById={subjectById} overdue={group.emphasis === "overdue"} emptyLabel="" />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="completed">
                <TaskList tasks={completed} subjectById={subjectById} emptyLabel="No completed tasks yet." />
              </TabsContent>
            </Tabs>
          </div>

          <div className="hidden lg:block">
            <TaskCalendar tasks={filtered} />
          </div>
        </div>
      )}
    </div>
  );
}
