import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as classSessionsApi from "@/api/classSessions";
import type { ClassSessionInput } from "@/api/classSessions";

export function useClassSessions(filters: { subjectId?: string; date?: string } = {}) {
  return useQuery({
    queryKey: ["classSessions", filters],
    queryFn: () => classSessionsApi.listClassSessions(filters),
  });
}

export function useClassSession(id: string | undefined) {
  return useQuery({
    queryKey: ["classSessions", id],
    queryFn: () => classSessionsApi.getClassSession(id!),
    enabled: Boolean(id),
  });
}

export function useCreateClassSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassSessionInput) => classSessionsApi.createClassSession(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classSessions"] }),
  });
}

export function useUpdateClassSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ClassSessionInput> }) =>
      classSessionsApi.updateClassSession(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classSessions"] }),
  });
}

export function useDeleteClassSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classSessionsApi.deleteClassSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classSessions"] }),
  });
}
