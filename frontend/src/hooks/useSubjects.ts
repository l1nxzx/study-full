import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/api/client";
import { useToast } from "@/hooks/useToast";
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

// Optimistic: a renamed or recoloured subject shows everywhere at once.
export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SubjectInput> }) => subjectsApi.updateSubject(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ["subjects"] });
      const snapshot = queryClient.getQueriesData({ queryKey: ["subjects"] });
      queryClient.setQueriesData({ queryKey: ["subjects"] }, (data: unknown) => {
        if (Array.isArray(data)) return data.map((s) => (s.id === id ? { ...s, ...input } : s));
        if (data && typeof data === "object" && (data as { id?: string }).id === id) return { ...data, ...input };
        return data;
      });
      return { snapshot };
    },
    onError: (err, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
      toast({ title: "Couldn't save the subject", description: getErrorMessage(err), variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectsApi.deleteSubject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}
