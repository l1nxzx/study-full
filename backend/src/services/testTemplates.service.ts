import { db } from "../config/firebase";
import { AppError } from "../utils/AppError";
import type { CreateTestTemplateInput, UpdateTestTemplateInput } from "../models/testTemplate.model";

const collection = db.collection("testTemplates");

function view(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    name: data.name as string,
    subjectId: (data.subjectId ?? null) as string | null,
    settings: data.settings,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
  };
}

async function getOwned(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) throw AppError.notFound("template");
  return doc;
}

export async function listTemplates(userId: string) {
  const snapshot = await collection.where("userId", "==", userId).get();
  return snapshot.docs.map((d) => view(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createTemplate(userId: string, input: CreateTestTemplateInput) {
  const now = new Date().toISOString();
  const data = { userId, name: input.name, subjectId: input.subjectId ?? null, settings: input.settings, createdAt: now, updatedAt: now };
  const ref = collection.doc();
  await ref.set(data);
  return view(ref.id, data);
}

export async function updateTemplate(userId: string, id: string, input: UpdateTestTemplateInput) {
  const doc = await getOwned(userId, id);
  const patch = { ...input, updatedAt: new Date().toISOString() };
  await doc.ref.update(patch);
  return view(id, { ...doc.data(), ...patch });
}

export async function deleteTemplate(userId: string, id: string) {
  const doc = await getOwned(userId, id);
  await doc.ref.delete();
}
