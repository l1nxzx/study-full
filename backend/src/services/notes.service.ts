import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { CreateNoteInput, UpdateNoteInput } from "../models/note.model";
import { userCache } from "../utils/userCache";
import { invalidateStatsAnswers } from "../utils/statsCache";
import { deleteAllAttachmentsForNote, listAttachmentsForNote } from "./attachments.service";

const collection = db.collection("notes");

interface ListFilters {
  subjectId?: string;
  sessionId?: string;
  limit?: number;
}

// All of the user's notes, kept in memory until a note is written (see utils/userCache).
const notesCache = userCache<any[]>(invalidateStatsAnswers);

export function invalidateNotes(userId: string): void {
  notesCache.invalidate(userId);
}

function allNotes(userId: string) {
  return notesCache.get(userId, async () => {
    const snapshot = await collection.where("userId", "==", userId).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
  });
}

export async function listNotes(userId: string, filters: ListFilters = {}) {
  const all = await allNotes(userId);
  const notes = all.filter(
    (note) => (!filters.subjectId || note.subjectId === filters.subjectId) && (!filters.sessionId || note.sessionId === filters.sessionId)
  );
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

export function createNote(userId: string, input: CreateNoteInput) {
  return notesCache.afterWrite(userId, async () => {
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
  });
}

export function updateNote(userId: string, id: string, input: UpdateNoteInput) {
  return notesCache.afterWrite(userId, async () => {
    await getNoteRaw(userId, id);
    await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
    return getNoteWithAttachments(userId, id);
  });
}

export function deleteNote(userId: string, id: string) {
  return notesCache.afterWrite(userId, async () => {
    await getNoteRaw(userId, id);
    await deleteAllAttachmentsForNote(id);
    await collection.doc(id).delete();
  });
}
