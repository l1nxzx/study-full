import { db, FieldValue } from "../config/firebase";
import type { ActivityHeartbeatInput } from "../models/activity.model";
import { inUserQueue, nextStamp } from "../utils/userQueue";

const daysCollection = db.collection("activityDays");
const sessionsCollection = db.collection("studySessions");
const metaCollection = db.collection("activityMeta");

// A gap longer than this between bits of activity starts a new study session.
export const SESSION_GAP_MS = 20 * 60 * 1000;
// One heartbeat never counts for more than this, whatever the client claims.
const MAX_SECONDS_PER_HEARTBEAT = 900;

// Notes and tests know their subject; resolve it here (cached) so time spent on a note
// also counts towards its subject without the client having to know.
// Keyed by user too: the same note id must never give one user another user's subject.
const subjectCache = new Map<string, string | null>();

async function subjectForDoc(collection: string, id: string, userId: string): Promise<string | null> {
  const key = `${userId}|${collection}/${id}`;
  if (subjectCache.has(key)) return subjectCache.get(key)!;
  const doc = await db.collection(collection).doc(id).get();
  const data = doc.data();
  const subjectId = doc.exists && data?.userId === userId ? (data.subjectId ?? null) : null;
  if (subjectCache.size > 5000) subjectCache.clear();
  subjectCache.set(key, subjectId);
  return subjectId;
}

// Recent updates per user, kept in memory and in the user's activity record: an update the app
// sends again (after a lost reply, or from a page closing) is recognised and not counted twice.
const RECENT_UPDATES = 100;
interface UserActivity {
  sessionId?: string;
  lastActiveAt: number;
  recent: { id: string; at: number }[];
}
const activityByUser = new Map<string, UserActivity>();

async function activityOf(userId: string): Promise<UserActivity> {
  const cached = activityByUser.get(userId);
  if (cached) return cached;
  const meta = (await metaCollection.doc(userId).get()).data() ?? {};
  const loaded: UserActivity = {
    sessionId: meta.currentSessionId,
    lastActiveAt: meta.lastActiveAt ?? 0,
    recent: Array.isArray(meta.recent) ? meta.recent : [],
  };
  activityByUser.set(userId, loaded);
  return loaded;
}

/**
 * Records study time sent by the app. Each update is written once (its id is remembered), and
 * the reply says when it was saved (`processedAt`, on the same clock as statistics' `asOf`).
 */
export function recordHeartbeat(userId: string, input: ActivityHeartbeatInput) {
  return inUserQueue(userId, async () => {
    const state = await activityOf(userId);
    if (input.id) {
      const earlier = state.recent.find((r) => r.id === input.id);
      if (earlier) return { recorded: 0, duplicate: true, processedAt: earlier.at };
    }

    // Resolve subjects first (cached per note or test).
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
    if (total === 0) return { recorded: 0, processedAt: nextStamp() };

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
    const batch = db.batch();
    const dayRef = daysCollection.doc(`${userId}_${input.date}`);
    let sessionId: string;
    if (state.sessionId && now - state.lastActiveAt <= SESSION_GAP_MS + total * 1000) {
      sessionId = state.sessionId;
      batch.set(sessionsCollection.doc(sessionId), { ...counters, lastActiveAt: new Date(now).toISOString() }, { merge: true });
    } else {
      const ref = sessionsCollection.doc();
      sessionId = ref.id;
      batch.set(ref, {
        userId,
        date: input.date,
        startedAt: new Date(now - total * 1000).toISOString(),
        lastActiveAt: new Date(now).toISOString(),
        ...counters,
      });
    }
    batch.set(dayRef, { userId, date: input.date, ...counters }, { merge: true });

    const processedAt = nextStamp();
    const recent = input.id ? [...state.recent, { id: input.id, at: processedAt }].slice(-RECENT_UPDATES) : state.recent;
    batch.set(metaCollection.doc(userId), { currentSessionId: sessionId, lastActiveAt: now, recent }, { merge: true });
    await batch.commit();

    state.sessionId = sessionId;
    state.lastActiveAt = now;
    state.recent = recent;
    return { recorded: total, processedAt };
  });
}
