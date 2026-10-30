import { useState } from "react";
import { Page, PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskItem } from "@/components/tasks/TaskItem";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useSubjects } from "@/hooks/useSubjects";
import { groupChronologically } from "@/lib/taskGroups";
import { cn } from "@/lib/utils";
import type { Subject, Task, TaskType } from "@/types";

function TaskList({
  tasks,
  subjectById,
  overdue,
  hideDate,
  emptyLabel,
}: {
  tasks: Task[];
  subjectById: Map<string, Subject>;
  overdue?: boolean;
  hideDate?: boolean;
  emptyLabel: string;
}) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  if (tasks.length === 0) {
    return <p className="py-4 text-sm text-fg-faint">{emptyLabel}</p>;
  }

  return (
    <div className="divide-y divide-rule">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          subject={task.subjectId ? subjectById.get(task.subjectId) : undefined}
          overdue={overdue}
          hideDate={hideDate}
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
  const hasTasks = !isLoading && tasks && tasks.length > 0;

  return (
    <Page width="wide">
      <PageHeader title="Tasks" description="Homework and exams, in the order they're due." actions={<TaskFormDialog />} />

      {isLoading && (
        <div className="max-w-[46rem] divide-y divide-rule">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 py-3.5">
              <Skeleton className="size-4" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && tasks?.length === 0 && (
        <EmptyState
          title="No tasks yet"
          description="Add homework and exams as they're set, and they'll show up here, on your overview and alongside your timetable."
          action={<TaskFormDialog />}
        />
      )}

      {hasTasks && (
        <div className="grid grid-cols-1 gap-x-14 gap-y-10 @4xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0 max-w-[46rem]">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Segmented
                label="Kind"
                size="sm"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "homework", label: "Homework" },
                  { value: "exam", label: "Exams" },
                ]}
              />
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="h-9 w-48 sm:h-8" aria-label="Subject">
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

            <Tabs defaultValue="open">
              <TabsList>
                <TabsTrigger value="open">
                  Open <span className="tabular text-fg-faint">{openCount}</span>
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Done <span className="tabular text-fg-faint">{completed.length}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="space-y-8">
                {openCount === 0 && <p className="py-2 text-sm text-fg-muted">Nothing open. You're all caught up.</p>}
                {groups.map((group) => {
                  // Groups that name a single day already say the date; the rows don't repeat it.
                  const singleDay = group.label === "Today" || group.label === "Tomorrow";
                  return (
                    <section key={group.label}>
                      <h2
                        className={cn(
                          "group-label flex items-baseline gap-2 border-b border-rule pb-2",
                          group.emphasis === "overdue" && "text-bad",
                          group.emphasis === "tomorrow" && "text-accent"
                        )}
                      >
                        {group.label}
                        <span className="font-normal text-fg-faint tabular">{group.tasks.length}</span>
                      </h2>
                      <TaskList
                        tasks={group.tasks}
                        subjectById={subjectById}
                        overdue={group.emphasis === "overdue"}
                        hideDate={singleDay}
                        emptyLabel=""
                      />
                    </section>
                  );
                })}
              </TabsContent>

              <TabsContent value="completed">
                <TaskList tasks={completed} subjectById={subjectById} emptyLabel="Nothing marked as done yet." />
              </TabsContent>
            </Tabs>
          </div>

          <aside className="hidden @4xl:block">
            <TaskCalendar tasks={filtered} />
          </aside>
        </div>
      )}
    </Page>
  );
}
