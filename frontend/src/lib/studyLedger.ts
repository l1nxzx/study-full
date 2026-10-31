import { del, get, set } from "idb-keyval";
import { apiClient, TOKEN_STORAGE_KEY } from "@/api/client";
import type { ActivityContext } from "@/lib/activity";

// This device's record of study time, shown on top of the server's totals (the overlay) until the
// server's next statistics answer includes it. Time is counted here at once, and sent to the
// server every 15 seconds in updates that carry an id: an update the server already has (sent
// again after a lost reply, or from a page that closed) is recognised and counted once.

export interface LedgerEntry extends ActivityContext {
  /** Local calendar day the time belongs to (YYYY-MM-DD). */
  date: string;
  seconds: number;
}

interface Batch {
  id: string;
  date: string;
  entries: Omit<LedgerEntry, "date">[];
}

interface Acked {
  /** When the server saved it, on the server's clock (see the statistics' asOf). */
  processedAt: number;
  date: string;
  entries: Omit<LedgerEntry, "date">[];
}

const STORAGE_KEY = "study.ledger";
const MAX_QUEUE = 50;
const KEEP_ACKED_MS = 24 * 60 * 60_000;

let loaded = false;
let queue: Batch[] = [];
let acked: Acked[] = [];
let bucket = new Map<string, LedgerEntry>();
let sending = false;
let version = 0;
let saveTimer: number | undefined;
const listeners = new Set<() => void>();

function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    set(STORAGE_KEY, { queue, acked }).catch(() => undefined);
  }, 500);
}

/** Forgets everything on this device (sign-out): unsent time belongs to the account it was counted for. */
export function clearLedger(): void {
  queue = [];
  acked = [];
  bucket = new Map();
  window.clearTimeout(saveTimer);
  changed();
  del(STORAGE_KEY).catch(() => undefined);
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Loads what was not yet confirmed (from before a reload) and sends it. */
export async function startLedger(): Promise<void> {
  if (!loaded) {
    loaded = true;
    try {
      const stored = await get<{ queue: Batch[]; acked: Acked[] }>(STORAGE_KEY);
      if (stored) {
        queue = stored.queue ?? [];
        acked = (stored.acked ?? []).filter((a) => Date.now() - a.processedAt < KEEP_ACKED_MS);
      }
    } catch {
      // Storage unavailable: start empty; the server copy is still right.
    }
    changed();
  }
  void sendQueue();
}

/** Counts study time just spent (called every few seconds while you're active). */
export function recordTime(ctx: ActivityContext, seconds: number) {
  const date = today();
  const key = `${date}|${ctx.area}|${ctx.noteId ?? ""}|${ctx.subjectId ?? ""}|${ctx.testId ?? ""}`;
  const entry = bucket.get(key) ?? { ...ctx, date, seconds: 0 };
  entry.seconds += seconds;
  bucket.set(key, entry);
  changed();
}

/** Moves the time counted so far into updates waiting to be sent (one per day). */
export function closeBucket() {
  if (bucket.size === 0) return;
  const byDate = new Map<string, Omit<LedgerEntry, "date">[]>();
  for (const { date, ...rest } of bucket.values()) {
    byDate.set(date, [...(byDate.get(date) ?? []), rest]);
  }
  bucket = new Map();
  for (const [date, entries] of byDate) {
    queue.push({ id: newId(), date, entries: entries.slice(0, 40) });
  }
  if (queue.length > MAX_QUEUE) {
    // Far behind (offline for a long time): combine what is left, one update per day.
    const merged = new Map<string, Omit<LedgerEntry, "date">[]>();
    for (const b of queue) merged.set(b.date, [...(merged.get(b.date) ?? []), ...b.entries]);
    queue = [...merged].map(([date, entries]) => ({ id: newId(), date, entries: entries.slice(0, 40) }));
  }
  changed();
  scheduleSave();
}

async function sendOne(batch: Batch, keepalive: boolean): Promise<number | null> {
  const body = {
    id: batch.id,
    date: batch.date,
    entries: batch.entries.map((e) => ({ ...e, seconds: Math.min(900, Math.round(e.seconds)) })),
  };
  if (keepalive) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    // The reply can't be read once the page is closing; the update stays queued and is sent
    // again with the same id, so the server recognises it.
    void fetch(`${apiClient.defaults.baseURL}/activity`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }).catch(() => undefined);
    return null;
  }
  const { data } = await apiClient.post<{ processedAt?: number }>("/activity", body);
  return data.processedAt ?? Date.now();
}

/** Sends waiting updates, oldest first, stopping at the first failure (kept for next time). */
export async function sendQueue(keepalive = false): Promise<void> {
  if (sending || queue.length === 0) return;
  sending = true;
  try {
    while (queue.length > 0) {
      const batch = queue[0];
      const processedAt = await sendOne(batch, keepalive);
      if (processedAt === null) break;
      queue = queue.slice(1);
      acked.push({ processedAt, date: batch.date, entries: batch.entries });
      changed();
      scheduleSave();
    }
    acked = acked.filter((a) => Date.now() - a.processedAt < KEEP_ACKED_MS);
  } catch {
    // Offline or the server is down: the updates stay queued; the next attempt uses the same ids.
  } finally {
    sending = false;
  }
}

export function subscribeLedger(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ledgerVersion(): number {
  return version;
}

/**
 * Study time this device has recorded that the server's statistics (answered at `asOf`) do not
 * include: time not yet saved, and time saved after that answer was computed.
 */
export function unconfirmedEntries(asOf: number): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  for (const e of bucket.values()) out.push(e);
  for (const b of queue) for (const e of b.entries) out.push({ ...e, date: b.date });
  for (const a of acked) if (a.processedAt > asOf) for (const e of a.entries) out.push({ ...e, date: a.date });
  return out;
}
