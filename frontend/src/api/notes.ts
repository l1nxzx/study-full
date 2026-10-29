import { apiClient } from "./client";
import type { Attachment, Note, NoteDetail } from "@/types";

export interface NoteInput {
  title: string;
  subjectId: string;
  sessionId?: string | null;
  date: string;
  contentMarkdown: string;
}

export function listNotes(filters: { subjectId?: string; sessionId?: string } = {}) {
  return apiClient.get<Note[]>("/notes", { params: filters }).then((r) => r.data);
}

export function getNote(id: string) {
  return apiClient.get<NoteDetail>(`/notes/${id}`).then((r) => r.data);
}

export function createNote(input: NoteInput) {
  return apiClient.post<NoteDetail>("/notes", input).then((r) => r.data);
}

export function updateNote(id: string, input: Partial<NoteInput>) {
  return apiClient.patch<NoteDetail>(`/notes/${id}`, input).then((r) => r.data);
}

export function deleteNote(id: string) {
  return apiClient.delete(`/notes/${id}`);
}

export function uploadAttachment(noteId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient
    .post<Attachment>(`/notes/${noteId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

export function deleteAttachment(noteId: string, attachmentId: string) {
  return apiClient.delete(`/notes/${noteId}/attachments/${attachmentId}`);
}
