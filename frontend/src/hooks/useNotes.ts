import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as notesApi from "@/api/notes";
import type { NoteInput } from "@/api/notes";
import { getErrorMessage } from "@/api/client";
import { useToast } from "@/hooks/useToast";
import { FRESHNESS } from "@/lib/freshness";

// Every cached copy of notes: the single-note entries and the lists. Saving and deleting
// change these at once (the page shows the result straight away) and put them back if the
// server says no.
type NotesSnapshot = [readonly unknown[], unknown][];

function snapshotNotes(queryClient: QueryClient): NotesSnapshot {
  return queryClient.getQueriesData({ queryKey: ["notes"] });
}

function restoreNotes(queryClient: QueryClient, snapshot: NotesSnapshot) {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

function patchNotes(queryClient: QueryClient, id: string, patch: ((note: { id: string }) => object | null)) {
  queryClient.setQueriesData({ queryKey: ["notes"] }, (data: unknown) => {
    if (Array.isArray(data)) return data.map((n) => (n.id === id ? patch(n) : n)).filter(Boolean);
    if (data && typeof data === "object" && (data as { id?: string }).id === id) return patch(data as { id: string }) ?? undefined;
    return data;
  });
}

export function useNotes(filters: { subjectId?: string; sessionId?: string } = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["notes", filters],
    queryFn: () => notesApi.listNotes(filters),
    enabled: options.enabled,
    staleTime: FRESHNESS.notes,
  });
}

export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => notesApi.getNote(id!),
    enabled: Boolean(id),
    staleTime: FRESHNESS.notes,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) => notesApi.createNote(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
}

// Optimistic: the edited note shows at once; if saving fails it goes back and the caller is told.
export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<NoteInput> }) => notesApi.updateNote(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const snapshot = snapshotNotes(queryClient);
      patchNotes(queryClient, id, (note) => ({ ...note, ...input, updatedAt: new Date().toISOString() }));
      return { snapshot };
    },
    onError: (_err, _variables, context) => {
      if (context) restoreNotes(queryClient, context.snapshot);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
}

// Optimistic: the note disappears at once; if deleting fails it comes back with a message.
export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => notesApi.deleteNote(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const snapshot = snapshotNotes(queryClient);
      queryClient.setQueriesData({ queryKey: ["notes"] }, (data: unknown) =>
        Array.isArray(data) ? data.filter((n) => n.id !== id) : data
      );
      return { snapshot };
    },
    onError: (err, _id, context) => {
      if (context) restoreNotes(queryClient, context.snapshot);
      toast({ title: "Couldn't delete the note", description: getErrorMessage(err), variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
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
