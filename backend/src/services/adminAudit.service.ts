import { db } from "../config/firebase";

const collection = db.collection("adminAudit");

// Every change the superadmin makes is recorded: who, what, to which account, and when.
export async function recordAdminAction(actorId: string, action: string, target: string | null, detail?: Record<string, unknown>) {
  await collection.doc().set({ actorId, action, target, detail: detail ?? null, at: new Date().toISOString() });
}

export async function recentAdminActions(limit = 50) {
  const snapshot = await collection.orderBy("at", "desc").limit(limit).get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
