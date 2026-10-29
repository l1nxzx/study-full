import type { Timestamp } from "firebase-admin/firestore";
import { db, FieldValue } from "../config/firebase";

// One doc per user (docId == userId) - a personal app only ever has one calendar
// subscription per person, so there's no need for a separate id/list layer.
const collection = db.collection("scheduleIntegrations");

export interface ScheduleIntegrationRecord {
  userId: string;
  icsUrl: string;
  connected: boolean;
  lastSyncAt: Timestamp | null;
  lastSyncStatus: "ok" | "error" | null;
  lastSyncError: string | null;
}

export async function getIntegration(userId: string): Promise<ScheduleIntegrationRecord | null> {
  const doc = await collection.doc(userId).get();
  return doc.exists ? (doc.data() as ScheduleIntegrationRecord) : null;
}

export async function saveIntegration(userId: string, icsUrl: string): Promise<void> {
  const ref = collection.doc(userId);
  const existing = await ref.get();

  await ref.set(
    {
      userId,
      icsUrl,
      connected: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true }
  );
}

export async function disconnectIntegration(userId: string): Promise<void> {
  await collection.doc(userId).set({ connected: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function recordSyncResult(userId: string, status: "ok" | "error", error?: string): Promise<void> {
  await collection.doc(userId).set(
    {
      lastSyncAt: FieldValue.serverTimestamp(),
      lastSyncStatus: status,
      lastSyncError: error ?? null,
    },
    { merge: true }
  );
}

// Used by the periodic sync loop - only equality filters, so this never needs a
// Firestore composite index.
export async function listConnectedUserIds(): Promise<string[]> {
  const snapshot = await collection.where("connected", "==", true).get();
  return snapshot.docs.map((doc) => doc.id);
}
