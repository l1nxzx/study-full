import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { CreateClassInput, UpdateClassInput } from "../models/class.model";

const collection = db.collection("classes");

// Your weekly classes change only when you edit them in the app, and every page that shows the
// timetable (overview, schedule, a subject) asks for them. The server keeps them in memory and
// reads Firestore again only after a change (or a restart). Writes are made here, so the copy
// is always cleared when something changes.
const classesCache = new Map<string, Record<string, any>[]>();

export function invalidateClasses(userId: string): void {
  classesCache.delete(userId);
}

export async function listClasses(userId: string) {
  const cached = classesCache.get(userId);
  if (cached) return cached;
  const snapshot = await collection.where("userId", "==", userId).get();
  const classes = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  classesCache.set(userId, classes);
  return classes;
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
  invalidateClasses(userId);
  return { id: docRef.id, ...payload };
}

export async function updateClass(userId: string, id: string, input: UpdateClassInput) {
  await getClass(userId, id);
  await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
  invalidateClasses(userId);
  return getClass(userId, id);
}

export async function deleteClass(userId: string, id: string) {
  await getClass(userId, id);
  await collection.doc(id).delete();
  invalidateClasses(userId);
}
