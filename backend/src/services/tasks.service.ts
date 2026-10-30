import { db, FieldValue } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { userCache } from "../utils/userCache";
import { CreateTaskInput, UpdateTaskInput } from "../models/task.model";

const collection = db.collection("tasks");

// All of the user's tasks, kept in memory until a task is written (see utils/userCache).
const tasksCache = userCache<any[]>();

export function invalidateTasks(userId: string): void {
  tasksCache.invalidate(userId);
}

function allTasks(userId: string) {
  return tasksCache.get(userId, async () => {
    const snapshot = await collection.where("userId", "==", userId).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"));
  });
}

export async function listTasks(userId: string, filters: { subjectId?: string; sessionId?: string } = {}) {
  const all = await allTasks(userId);
  return all.filter(
    (task) => (!filters.subjectId || task.subjectId === filters.subjectId) && (!filters.sessionId || task.sessionId === filters.sessionId)
  );
}

export async function getTask(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) {
    throw AppError.notFound("task");
  }
  return { id: doc.id, ...doc.data() };
}

export function createTask(userId: string, input: CreateTaskInput) {
  return tasksCache.afterWrite(userId, async () => {
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
  });
}

export function updateTask(userId: string, id: string, input: UpdateTaskInput) {
  return tasksCache.afterWrite(userId, async () => {
    await getTask(userId, id);
    await collection.doc(id).update({ ...input, updatedAt: FieldValue.serverTimestamp() });
    return getTask(userId, id);
  });
}

export function deleteTask(userId: string, id: string) {
  return tasksCache.afterWrite(userId, async () => {
    await getTask(userId, id);
    await collection.doc(id).delete();
  });
}
