import { db, FieldValue } from "../config/firebase";
import type { ActivityHeartbeatInput } from "../models/activity.model";

const daysCollection = db.collection("activityDays");
const sessionsCollection = db.collection("studySessions");
const metaCollection = db.collection("activityMeta");

// A gap longer than this between bits of activity starts a new study session.
export const SESSION_GAP_MS = 20 * 60 * 1000;
// One heartbeat never counts for more than this, whatever the client claims.
const MAX_SECONDS_PER_HEARTBEAT = 900;

// Notes and tests know their subject; resolve it here (cached) so time spent on a note
// also counts towards its subject without the client having to know.
const subjectCache = new Map<string, string | null>();

async function subjectForDoc(collection: string, id: string, userId: string): Promise<string | null> {
  const key = `${collection}/${id}`;
  if (subjectCache.has(key)) return subjectCache.get(key)!;
  const doc = await db.collection(collection).doc(id).get();
  const data = doc.data();
  const subjectId = doc.exists && data?.userId === userId ? (data.subjectId ?? null) : null;
  if (subjectCache.size > 5000) subjectCache.clear();
  subjectCache.set(key, subjectId);
  return subjectId;
}

export async function recordHeartbeat(userId: string, input: ActivityHeartbeatInput) {
  // Resolve subjects first, outside the transaction.
  const entries = await Promise.all(
    input.entries.map(async (e) => ({
      ...e,
      subjectId:
        e.subjectId ??
        (e.noteId ? await subjectForDoc("notes", e.noteId, userId) : e.testId ? await subjectForDoc("tests", e.testId, userId) : null),
    }))
  );

  let budget = MAX_SECONDS_PER_HEARTBEAT;
  const increments: Record<string, number> = {};
  let total = 0;
  for (const e of entries) {
    const seconds = Math.min(e.seconds, budget);
    if (seconds <= 0) break;
    budget -= seconds;
    total += seconds;
    const add = (key: string) => (increments[key] = (increments[key] ?? 0) + seconds);
    add(`byArea.${e.area}`);
    if (e.subjectId) add(`bySubject.${e.subjectId}`);
    if (e.noteId) add(`byNote.${e.noteId}`);
    if (e.testId) add(`byTest.${e.testId}`);
  }
  if (total === 0) return { recorded: 0 };

  const nested = (prefix: string) => {
    const obj: Record<string, FirebaseFirestore.FieldValue> = {};
    for (const [key, value] of Object.entries(increments)) {
      if (key.startsWith(`${prefix}.`)) obj[key.slice(prefix.length + 1)] = FieldValue.increment(value);
    }
    return obj;
  };
  // Only maps with something in them: with merge, Firestore writes an empty map as a value,
  // which would wipe that day's (and session's) totals for every note, subject or test.
  const counters: Record<string, unknown> = { seconds: FieldValue.increment(total) };
  for (const prefix of ["byArea", "bySubject", "byNote", "byTest"]) {
    const map = nested(prefix);
    if (Object.keys(map).length > 0) counters[prefix] = map;
  }

  const now = Date.now();
  const metaRef = metaCollection.doc(userId);
  const dayRef = daysCollection.doc(`${userId}_${input.date}`);

  await db.runTransaction(async (tx) => {
    const meta = await tx.get(metaRef);
    const lastActiveAt: number = meta.data()?.lastActiveAt ?? 0;
    const currentSessionId: string | undefined = meta.data()?.currentSessionId;

    let sessionRef: FirebaseFirestore.DocumentReference;
    if (currentSessionId && now - lastActiveAt <= SESSION_GAP_MS + total * 1000) {
      sessionRef = sessionsCollection.doc(currentSessionId);
      tx.set(sessionRef, { ...counters, lastActiveAt: new Date(now).toISOString() }, { merge: true });
    } else {
      sessionRef = sessionsCollection.doc();
      tx.set(sessionRef, {
        userId,
        date: input.date,
        startedAt: new Date(now - total * 1000).toISOString(),
        lastActiveAt: new Date(now).toISOString(),
        ...counters,
      });
    }

    tx.set(metaRef, { currentSessionId: sessionRef.id, lastActiveAt: now }, { merge: true });
    tx.set(dayRef, { userId, date: input.date, ...counters }, { merge: true });
  });

  return { recorded: total };
}
