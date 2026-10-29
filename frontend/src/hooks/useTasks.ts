import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as tasksApi from "@/api/tasks";
import type { TaskInput } from "@/api/tasks";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/api/client";
import type { Task } from "@/types";

export function useTasks(filters: { subjectId?: string; sessionId?: string } = {}, options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: ["tasks", filters], queryFn: () => tasksApi.listTasks(filters), enabled: options.enabled });
}

// Tasks are rendered from three different query caches depending on which page is
// looking at them (the flat ["tasks", filters] list, a Subject's embedded
// upcomingTasks, a ClassSession's embedded tasks) - an optimistic edit has to patch all
// three in lockstep or whichever page isn't the one you clicked from would lag behind
// until the next refetch.
function mapTaskCaches(queryClient: QueryClient, mapper: (task: Task) => Task | null) {
  queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
    old?.map((t) => mapper(t) ?? t).filter((t): t is Task => t !== null)
  );
  queryClient.setQueriesData({ queryKey: ["subjects"] }, (old: unknown) => {
    if (!old || typeof old !== "object" || !Array.isArray((old as { upcomingTasks?: unknown }).upcomingTasks)) return old;
    const detail = old as { upcomingTasks: Task[] };
    return { ...detail, upcomingTasks: detail.upcomingTasks.map((t) => mapper(t) ?? t).filter((t): t is Task => t !== null) };
  });
  queryClient.setQueriesData({ queryKey: ["classSessions"] }, (old: unknown) => {
    if (!old || typeof old !== "object" || !Array.isArray((old as { tasks?: unknown }).tasks)) return old;
    const detail = old as { tasks: Task[] };
    return { ...detail, tasks: detail.tasks.map((t) => mapper(t) ?? t).filter((t): t is Task => t !== null) };
  });
}

function snapshotTaskCaches(queryClient: QueryClient) {
  return [
    ...queryClient.getQueriesData({ queryKey: ["tasks"] }),
    ...queryClient.getQueriesData({ queryKey: ["subjects"] }),
    ...queryClient.getQueriesData({ queryKey: ["classSessions"] }),
  ] as [readonly unknown[], unknown][];
}

function restoreTaskCaches(queryClient: QueryClient, snapshot: [readonly unknown[], unknown][]) {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => tasksApi.createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TaskInput> & { completed?: boolean } }) =>
      tasksApi.updateTask(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshot = snapshotTaskCaches(queryClient);
      mapTaskCaches(queryClient, (t) => (t.id === id ? { ...t, ...input } : t));
      return { snapshot };
    },
    onError: (err, _variables, context) => {
      if (context) restoreTaskCaches(queryClient, context.snapshot);
      toast({ title: "Couldn't save task", description: getErrorMessage(err), variant: "destructive" });
    },
    onSuccess: (updated) => {
      mapTaskCaches(queryClient, (t) => (t.id === updated.id ? updated : t));
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshot = snapshotTaskCaches(queryClient);
      mapTaskCaches(queryClient, (t) => (t.id === id ? null : t));
      return { snapshot };
    },
    onError: (err, _id, context) => {
      if (context) restoreTaskCaches(queryClient, context.snapshot);
      toast({ title: "Couldn't delete task", description: getErrorMessage(err), variant: "destructive" });
    },
  });
}
