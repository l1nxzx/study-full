import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { pickUnusedColor } from "../utils/colorPalette";
import { CreateSubjectInput, UpdateSubjectInput } from "../models/subject.model";

const collection = db.collection("subjects");

export async function listSubjects(userId: string) {
  const snapshot = await collection.where("userId", "==", userId).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
}

export async function getSubject(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) {
    throw AppError.notFound("subject");
  }
  return { id: doc.id, ...doc.data() };
}

export async function createSubject(userId: string, input: CreateSubjectInput) {
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

export async function updateSubject(userId: string, id: string, input: UpdateSubjectInput) {
  await getSubject(userId, id);
  await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
  return getSubject(userId, id);
}

export async function deleteSubject(userId: string, id: string) {
  await getSubject(userId, id);
  await collection.doc(id).delete();
}
