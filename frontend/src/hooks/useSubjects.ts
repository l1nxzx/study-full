import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as subjectsApi from "@/api/subjects";
import type { SubjectInput } from "@/api/subjects";

export function useSubjects(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: ["subjects"], queryFn: subjectsApi.listSubjects, enabled: options.enabled });
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: ["subjects", id],
    queryFn: () => subjectsApi.getSubject(id!),
    enabled: Boolean(id),
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubjectInput) => subjectsApi.createSubject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SubjectInput> }) => subjectsApi.updateSubject(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["subjects", variables.id] });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectsApi.deleteSubject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}
