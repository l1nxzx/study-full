import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as classesApi from "@/api/classes";
import type { ClassInput } from "@/api/classes";
import { FRESHNESS } from "@/lib/freshness";

export function useClasses(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: ["classes"], queryFn: classesApi.listClasses, enabled: options.enabled, staleTime: FRESHNESS.classes });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassInput) => classesApi.createClass(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ClassInput> }) => classesApi.updateClass(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classesApi.deleteClass(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
}
