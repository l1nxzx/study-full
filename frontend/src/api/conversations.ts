import { apiClient } from "./client";

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  label?: string;
  groundedInNote?: boolean;
  isError?: boolean;
  createdAt?: string;
}

export interface ConversationSummary {
  id: string;
  noteId: string | null;
  subjectId: string | null;
  title: string;
  messageCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation extends ConversationSummary {
  messages: StoredChatMessage[];
}

export function listConversations(filters: { noteId?: string; scope?: "general" | "note" }) {
  return apiClient.get<ConversationSummary[]>("/conversations", { params: filters }).then((r) => r.data);
}

export function getConversation(id: string) {
  return apiClient.get<Conversation>(`/conversations/${id}`).then((r) => r.data);
}

export function createConversation(input: { noteId?: string | null; messages: StoredChatMessage[] }) {
  return apiClient.post<Conversation>("/conversations", input).then((r) => r.data);
}

export function updateConversation(id: string, messages: StoredChatMessage[]) {
  return apiClient.put<Conversation>(`/conversations/${id}`, { messages }).then((r) => r.data);
}

export function deleteConversation(id: string) {
  return apiClient.delete(`/conversations/${id}`);
}
