import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { CreateClassInput, UpdateClassInput } from "../models/class.model";

const collection = db.collection("classes");

export async function listClasses(userId: string) {
  const snapshot = await collection.where("userId", "==", userId).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}

export async function getClass(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) {
    throw AppError.notFound("class");
  }
  return { id: doc.id, ...doc.data() };
}

export async function createClass(userId: string, input: CreateClassInput) {
  const docRef = collection.doc();
  const payload = {
    userId,
    subjectId: input.subjectId,
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    room: input.room ?? null,
    teacher: input.teacher ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await docRef.set(payload);
  return { id: docRef.id, ...payload };
}

export async function updateClass(userId: string, id: string, input: UpdateClassInput) {
  await getClass(userId, id);
  await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
  return getClass(userId, id);
}

export async function deleteClass(userId: string, id: string) {
  await getClass(userId, id);
  await collection.doc(id).delete();
}
