import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as notesApi from "@/api/notes";
import type { NoteInput } from "@/api/notes";

export function useNotes(filters: { subjectId?: string; sessionId?: string } = {}, options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: ["notes", filters], queryFn: () => notesApi.listNotes(filters), enabled: options.enabled });
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => notesApi.getNote(id!),
    enabled: Boolean(id),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) => notesApi.createNote(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<NoteInput> }) => notesApi.updateNote(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", variables.id] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesApi.deleteNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, file }: { noteId: string; file: File }) => notesApi.uploadAttachment(noteId, file),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ["notes", variables.noteId] }),
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, attachmentId }: { noteId: string; attachmentId: string }) =>
      notesApi.deleteAttachment(noteId, attachmentId),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ["notes", variables.noteId] }),
  });
}
