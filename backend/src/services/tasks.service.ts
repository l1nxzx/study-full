import type { Query } from "firebase-admin/firestore";
import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { CreateTaskInput, UpdateTaskInput } from "../models/task.model";

const collection = db.collection("tasks");

export async function listTasks(userId: string, filters: { subjectId?: string; sessionId?: string } = {}) {
  let query: Query = collection.where("userId", "==", userId);
  if (filters.subjectId) query = query.where("subjectId", "==", filters.subjectId);
  if (filters.sessionId) query = query.where("sessionId", "==", filters.sessionId);

  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"));
}

export async function getTask(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) {
    throw AppError.notFound("task");
  }
  return { id: doc.id, ...doc.data() };
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const docRef = collection.doc();
  const payload = {
    userId,
    title: input.title,
    type: input.type ?? "homework",
    examKind: input.type === "exam" ? (input.examKind ?? null) : null,
    description: input.description ?? null,
    subjectId: input.subjectId ?? null,
    sessionId: input.sessionId ?? null,
    dueDate: input.dueDate ?? null,
    completed: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await docRef.set(payload);
  return { id: docRef.id, ...payload };
}

export async function updateTask(userId: string, id: string, input: UpdateTaskInput) {
  await getTask(userId, id);
  await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
  return getTask(userId, id);
}

export async function deleteTask(userId: string, id: string) {
  await getTask(userId, id);
  await collection.doc(id).delete();
}
