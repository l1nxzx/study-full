import { db, FieldValue } from "../config/firebase";

const collection = db.collection("scheduleEvents");

export type ScheduleEventStatus = "scheduled" | "cancelled" | "changed";

export interface ScheduleEventInput {
  source: "edupage";
  subjectId: string | null;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room: string | null;
  teacher: string | null;
  status: ScheduleEventStatus;
  changeNote: string | null;
}

// Fetches everything for the user (equality-only, so it never needs a Firestore
// composite index) and filters the date range in memory - fine at personal-app scale
// (at most a few hundred imported lessons).
export async function listScheduleEvents(userId: string, from?: string, to?: string) {
  const snapshot = await collection.where("userId", "==", userId).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as any)
    .filter((event) => (!from || event.date >= from) && (!to || event.date <= to))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

// Raw snapshot docs for a user, fetched once per sync and reused for both the upsert
// diff and stale-event pruning below - avoids the old N+1 pattern of one query per
// imported occurrence (a 60-day EduPage window is 300-400+ lessons, so that was
// hundreds of extra reads and an unconditional write per lesson every 30 minutes).
export async function listRawDocsByUser(userId: string): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snapshot = await collection.where("userId", "==", userId).get();
  return snapshot.docs;
}

export interface UpsertItem {
  externalUid: string;
  data: ScheduleEventInput;
}

const CHUNK_SIZE = 450; // stays under Firestore's 500-write batch limit with headroom

// Diffs the already-fetched existing docs against the freshly parsed feed and only
// writes documents that are new or actually changed - a lesson that comes back
// identical to what's already stored costs zero writes instead of one every sync.
export async function batchUpsertScheduleEvents(
  userId: string,
  existingDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  items: UpsertItem[]
): Promise<void> {
  const byUid = new Map(existingDocs.map((doc) => [doc.data().externalUid as string | undefined, doc]));

  type PendingWrite = { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown>; isCreate: boolean };
  const writes: PendingWrite[] = [];

  for (const { externalUid, data } of items) {
    const existing = byUid.get(externalUid);

    if (!existing) {
      writes.push({
        ref: collection.doc(),
        isCreate: true,
        data: { userId, externalUid, ...data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
      });
      continue;
    }

    const prev = existing.data();
    const comparedFields = ["title", "date", "startTime", "endTime", "room", "teacher"] as const;
    const changed = comparedFields.some((field) => prev[field] !== data[field]);
    const nextStatus: ScheduleEventStatus = data.status === "cancelled" ? "cancelled" : changed ? "changed" : data.status;

    const isIdentical =
      !changed &&
      prev.status === nextStatus &&
      prev.subjectId === data.subjectId &&
      prev.changeNote === data.changeNote &&
      prev.source === data.source;
    if (isIdentical) continue;

    writes.push({ ref: existing.ref, isCreate: false, data: { ...data, status: nextStatus, updatedAt: FieldValue.serverTimestamp() } });
  }

  for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
    const chunk = writes.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const w of chunk) {
      if (w.isCreate) batch.set(w.ref, w.data);
      else batch.update(w.ref, w.data);
    }
    await batch.commit();
  }
}

// After a sync, deletes previously-imported future events whose UID no longer appears
// in the feed (the lesson was removed/replaced upstream). Never touches past dates, so
// history isn't lost just because the feed's rolling window moved on. Reuses the same
// existingDocs snapshot the upsert step already fetched instead of querying again.
export async function pruneStaleFutureEvents(
  userId: string,
  existingDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  seenUids: Set<string>,
  todayISO: string
): Promise<void> {
  const staleDocs = existingDocs.filter((doc) => {
    const data = doc.data();
    return data.source === "edupage" && data.date >= todayISO && !seenUids.has(data.externalUid);
  });

  for (let i = 0; i < staleDocs.length; i += CHUNK_SIZE) {
    const chunk = staleDocs.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
