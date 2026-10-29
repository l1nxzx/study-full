import type { Query } from "firebase-admin/firestore";
import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { CreateNoteInput, UpdateNoteInput } from "../models/note.model";
import { deleteAllAttachmentsForNote, listAttachmentsForNote } from "./attachments.service";

const collection = db.collection("notes");

interface ListFilters {
  subjectId?: string;
  sessionId?: string;
  limit?: number;
}

export async function listNotes(userId: string, filters: ListFilters = {}) {
  let query: Query = collection.where("userId", "==", userId);
  if (filters.subjectId) query = query.where("subjectId", "==", filters.subjectId);
  if (filters.sessionId) query = query.where("sessionId", "==", filters.sessionId);

  const snapshot = await query.get();
  const notes = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));

  return filters.limit ? notes.slice(0, filters.limit) : notes;
}

export async function getNoteRaw(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) {
    throw AppError.notFound("note");
  }
  return { id: doc.id, ...doc.data() } as any;
}

export async function getNoteWithAttachments(userId: string, id: string) {
  const note = await getNoteRaw(userId, id);
  const attachments = await listAttachmentsForNote(id);
  return { ...note, attachments };
}

export async function createNote(userId: string, input: CreateNoteInput) {
  const docRef = collection.doc();
  const payload = {
    userId,
    subjectId: input.subjectId,
    sessionId: input.sessionId ?? null,
    title: input.title,
    date: input.date,
    contentMarkdown: input.contentMarkdown ?? "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await docRef.set(payload);
  return { id: docRef.id, ...payload, attachments: [] };
}

export async function updateNote(userId: string, id: string, input: UpdateNoteInput) {
  await getNoteRaw(userId, id);
  await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
  return getNoteWithAttachments(userId, id);
}

export async function deleteNote(userId: string, id: string) {
  await getNoteRaw(userId, id);
  await deleteAllAttachmentsForNote(id);
  await collection.doc(id).delete();
}
