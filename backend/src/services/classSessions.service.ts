import type { Query } from "firebase-admin/firestore";
import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { CreateClassSessionInput, UpdateClassSessionInput } from "../models/classSession.model";

const collection = db.collection("classSessions");

export async function listClassSessions(userId: string, filters: { subjectId?: string; date?: string }) {
  let query: Query = collection.where("userId", "==", userId);
  if (filters.subjectId) query = query.where("subjectId", "==", filters.subjectId);
  if (filters.date) query = query.where("date", "==", filters.date);

  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => b.date.localeCompare(a.date));
}

export async function getClassSession(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) {
    throw AppError.notFound("class session");
  }
  return { id: doc.id, ...doc.data() };
}

export async function createClassSession(userId: string, input: CreateClassSessionInput) {
  const docRef = collection.doc();
  const payload = {
    userId,
    classId: input.classId ?? null,
    subjectId: input.subjectId,
    date: input.date,
    title: input.title ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await docRef.set(payload);
  return { id: docRef.id, ...payload };
}

export async function updateClassSession(userId: string, id: string, input: UpdateClassSessionInput) {
  await getClassSession(userId, id);
  await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
  return getClassSession(userId, id);
}

export async function deleteClassSession(userId: string, id: string) {
  await getClassSession(userId, id);
  await collection.doc(id).delete();
}
