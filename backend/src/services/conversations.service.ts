import { db } from "../config/firebase";
import { AppError } from "../utils/AppError";
import type { ChatMessage, CreateConversationInput, UpdateConversationInput } from "../models/conversation.model";
import { getNoteRaw } from "./notes.service";

const collection = db.collection("conversations");

// Firestore documents are capped at 1 MiB; keep well under it by dropping the oldest
// messages of a very long conversation.
const MAX_MESSAGES_BYTES = 800_000;

function fitMessages(messages: ChatMessage[]): ChatMessage[] {
  let kept = messages;
  while (kept.length > 2 && Buffer.byteLength(JSON.stringify(kept)) > MAX_MESSAGES_BYTES) {
    kept = kept.slice(2);
  }
  return kept;
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user" && !m.isError);
  if (!first) return "New conversation";
  const text = first.label === "Summary" ? "Summary of the note" : first.content.replace(/\s+/g, " ").replace(/^"|"$/g, "").trim();
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

// Stored alongside the messages so lists and statistics never have to read message bodies.
function summaryFields(messages: ChatMessage[]) {
  return {
    messageCount: messages.length,
    questionCount: messages.filter((m) => m.role === "user").length,
  };
}

function toSummary(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    noteId: data.noteId ?? null,
    subjectId: data.subjectId ?? null,
    title: data.title,
    messageCount: data.messageCount ?? 0,
    questionCount: data.questionCount ?? 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listConversations(userId: string, filters: { noteId?: string; scope?: "general" | "note" } = {}) {
  const snapshot = await collection
    .where("userId", "==", userId)
    .select("noteId", "subjectId", "title", "messageCount", "questionCount", "createdAt", "updatedAt")
    .get();
  return snapshot.docs
    .map((doc) => toSummary(doc.id, doc.data()))
    .filter((c) => {
      if (filters.noteId) return c.noteId === filters.noteId;
      if (filters.scope === "general") return !c.noteId;
      if (filters.scope === "note") return Boolean(c.noteId);
      return true;
    })
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

async function getOwned(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) throw AppError.notFound("conversation");
  return doc;
}

export async function getConversation(userId: string, id: string) {
  const doc = await getOwned(userId, id);
  const data = doc.data()!;
  return { ...toSummary(doc.id, data), messages: (data.messages ?? []) as ChatMessage[] };
}

export async function createConversation(userId: string, input: CreateConversationInput) {
  let subjectId: string | null = null;
  if (input.noteId) {
    const note = await getNoteRaw(userId, input.noteId);
    subjectId = note.subjectId ?? null;
  }
  const messages = fitMessages(input.messages);
  const now = new Date().toISOString();
  const docRef = collection.doc();
  const payload = {
    userId,
    noteId: input.noteId ?? null,
    subjectId,
    title: input.title || deriveTitle(messages),
    messages,
    ...summaryFields(messages),
    createdAt: now,
    updatedAt: now,
  };
  await docRef.set(payload);
  return { ...toSummary(docRef.id, payload), messages };
}

export async function updateConversation(userId: string, id: string, input: UpdateConversationInput) {
  const doc = await getOwned(userId, id);
  const messages = fitMessages(input.messages);
  const existing = doc.data()!;
  const patch = {
    messages,
    ...summaryFields(messages),
    title: input.title || (existing.title === "New conversation" ? deriveTitle(messages) : existing.title),
    updatedAt: new Date().toISOString(),
  };
  await doc.ref.update(patch);
  return { ...toSummary(doc.id, { ...existing, ...patch }), messages };
}

export async function deleteConversation(userId: string, id: string) {
  const doc = await getOwned(userId, id);
  await doc.ref.delete();
}
