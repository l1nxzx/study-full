import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { pickUnusedColor } from "../utils/colorPalette";
import { CreateSubjectInput, UpdateSubjectInput } from "../models/subject.model";
import { deleteAllAttachmentsForNote } from "./attachments.service";
import { invalidateClasses } from "./classes.service";
import { invalidateNotes } from "./notes.service";
import { invalidateTasks } from "./tasks.service";
import { invalidateTests } from "./tests.service";
import { userCache } from "../utils/userCache";

const collection = db.collection("subjects");

// The user's subjects, kept in memory until one is written (see utils/userCache).
const subjectsCache = userCache<any[]>();

export function invalidateSubjects(userId: string): void {
  subjectsCache.invalidate(userId);
}

export function listSubjects(userId: string) {
  return subjectsCache.get(userId, async () => {
    const snapshot = await collection.where("userId", "==", userId).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  });
}

export async function getSubject(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) {
    throw AppError.notFound("subject");
  }
  return { id: doc.id, ...doc.data() };
}

export function createSubject(userId: string, input: CreateSubjectInput) {
  return subjectsCache.afterWrite(userId, async () => {
    const docRef = collection.doc();
    const payload = {
      userId,
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(payload);
    return { id: docRef.id, ...payload };
  });
}

// Used by the EduPage sync: looks up a subject by exact name for this user, or creates
// one with a color that doesn't collide with any of their existing subjects. This is
// how imported lessons like "FYZ"/"MAT" get their own real Subject to link/navigate to.
export async function findOrCreateSubjectByName(userId: string, name: string): Promise<{ id: string; color: string | null }> {
  const trimmed = name.trim();
  const existing = await collection.where("userId", "==", userId).where("name", "==", trimmed).limit(1).get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    return { id: doc.id, color: doc.data().color ?? null };
  }

  const all = await listSubjects(userId);
  const color = pickUnusedColor(all.map((s: any) => s.color));
  const created = await createSubject(userId, { name: trimmed, color });
  return { id: created.id, color };
}

export function updateSubject(userId: string, id: string, input: UpdateSubjectInput) {
  return subjectsCache.afterWrite(userId, async () => {
    await getSubject(userId, id);
    await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
    return getSubject(userId, id);
  });
}

// Writes in batches below Firestore's 500-operation limit.
async function inBatches(refs: FirebaseFirestore.DocumentReference[], write: (batch: FirebaseFirestore.WriteBatch, ref: FirebaseFirestore.DocumentReference) => void) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((ref) => write(batch, ref));
    await batch.commit();
  }
}

const ownedBySubject = (name: string, userId: string, subjectId: string) =>
  db.collection(name).where("userId", "==", userId).where("subjectId", "==", subjectId).get();

/**
 * Deletes a subject and settles everything that pointed at it. Its notes are deleted (with
 * their attachments) or kept without a subject, as the student chose. Tasks and tests are kept
 * (and test templates) without a subject; the subject's classes and class sessions only make
 * sense with it and go.
 * Recorded study time stays, but statistics no longer list a subject that doesn't exist.
 */
export async function deleteSubject(userId: string, id: string, options: { deleteNotes: boolean }) {
  await getSubject(userId, id);
  const [notes, tasks, tests, classes, sessions, templates] = await Promise.all(
    ["notes", "tasks", "tests", "classes", "classSessions", "testTemplates"].map((name) => ownedBySubject(name, userId, id))
  );

  if (options.deleteNotes) {
    for (const note of notes.docs) {
      await deleteAllAttachmentsForNote(note.id);
    }
    await inBatches(notes.docs.map((d) => d.ref), (batch, ref) => batch.delete(ref));
  } else {
    await inBatches(notes.docs.map((d) => d.ref), (batch, ref) => batch.update(ref, { subjectId: null, sessionId: null }));
  }
  await inBatches(tasks.docs.map((d) => d.ref), (batch, ref) => batch.update(ref, { subjectId: null, sessionId: null }));
  await inBatches([...tests.docs, ...templates.docs].map((d) => d.ref), (batch, ref) => batch.update(ref, { subjectId: null }));
  await inBatches([...classes.docs, ...sessions.docs].map((d) => d.ref), (batch, ref) => batch.delete(ref));
  invalidateClasses(userId);
  invalidateNotes(userId);
  invalidateTasks(userId);
  invalidateTests(userId);
  await collection.doc(id).delete();
  invalidateSubjects(userId);
  return { notesDeleted: options.deleteNotes ? notes.size : 0, notesKept: options.deleteNotes ? 0 : notes.size };
}
