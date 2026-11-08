import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import type { NoteStats, OverviewStats, SubjectStats } from "@/api/stats";
import { addDaysISO, todayISO } from "@/lib/date";
import { type LedgerEntry, ledgerVersion, subscribeLedger, unconfirmedEntries } from "@/lib/studyLedger";

// The statistics the server computed, plus the study time this device has that the server's
// answer doesn't include yet. The server is still the source: the overlay only fills the gap
// until the next statistics answer (which is fetched at least every few minutes).

export interface StudyOverlay {
  entries: LedgerEntry[];
  /** The subject of a note, from the notes the app already has loaded. */
  subjectOf: (noteId: string) => string | undefined;
}

export function useStudyOverlay(asOf: number | undefined): StudyOverlay | null {
  const queryClient = useQueryClient();
  useSyncExternalStore(subscribeLedger, ledgerVersion, ledgerVersion);
  if (asOf === undefined) return null;
  const subjects = new Map<string, string>();
  for (const [, data] of queryClient.getQueriesData<unknown>({ queryKey: ["notes"] })) {
    const list = Array.isArray(data) ? data : [data];
    for (const note of list as { id?: string; subjectId?: string | null }[]) {
      if (note?.id && note.subjectId) subjects.set(note.id, note.subjectId);
    }
  }
  return {
    entries: unconfirmedEntries(asOf),
    subjectOf: (noteId) => subjects.get(noteId),
  };
}

const sumOf = (entries: LedgerEntry[]) => entries.reduce((total, e) => total + e.seconds, 0);

function since(entries: LedgerEntry[], from: string) {
  return entries.filter((e) => e.date >= from);
}

function addToDays(days: { date: string; seconds: number }[], entries: LedgerEntry[]) {
  return days.map((d) => ({ ...d, seconds: d.seconds + sumOf(entries.filter((e) => e.date === d.date)) }));
}

function addToAllDays(allDays: { date: string; seconds: number }[], entries: LedgerEntry[]) {
  const byDate = new Map(allDays.map((d) => [d.date, d.seconds]));
  for (const e of entries) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.seconds);
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, seconds]) => ({ date, seconds }));
}

export function overviewWithStudy(stats: OverviewStats, overlay: StudyOverlay, today = todayISO()): OverviewStats {
  const { entries, subjectOf } = overlay;
  const week = since(entries, addDaysISO(today, -6));
  const month = since(entries, addDaysISO(today, -29));
  const byArea = { ...stats.time.byArea };
  for (const e of entries) byArea[e.area] = (byArea[e.area] ?? 0) + e.seconds;

  const bySubjectSeconds = new Map<string, number>();
  for (const e of entries) {
    const subjectId = e.subjectId ?? (e.noteId ? subjectOf(e.noteId) : undefined);
    if (subjectId) bySubjectSeconds.set(subjectId, (bySubjectSeconds.get(subjectId) ?? 0) + e.seconds);
  }
  const byNoteSeconds = new Map<string, number>();
  for (const e of entries) if (e.noteId) byNoteSeconds.set(e.noteId, (byNoteSeconds.get(e.noteId) ?? 0) + e.seconds);

  return {
    ...stats,
    time: {
      ...stats.time,
      totalSeconds: stats.time.totalSeconds + sumOf(entries),
      todaySeconds: stats.time.todaySeconds + sumOf(entries.filter((e) => e.date === today)),
      last7Seconds: stats.time.last7Seconds + sumOf(week),
      last30Seconds: stats.time.last30Seconds + sumOf(month),
      days: addToDays(stats.time.days, entries),
      allDays: addToAllDays(stats.time.allDays, entries),
      byArea,
      bySubject: stats.time.bySubject
        .map((s) => ({ ...s, seconds: s.seconds + (bySubjectSeconds.get(s.subjectId) ?? 0) }))
        .sort((a, b) => b.seconds - a.seconds),
      topNotes: stats.time.topNotes
        .map((n) => ({ ...n, seconds: n.seconds + (byNoteSeconds.get(n.noteId) ?? 0) }))
        .sort((a, b) => b.seconds - a.seconds),
    },
  };
}

export function noteWithStudy(stats: NoteStats, noteId: string, overlay: StudyOverlay, today = todayISO()): NoteStats {
  const mine = overlay.entries.filter((e) => e.noteId === noteId);
  return {
    ...stats,
    time: {
      ...stats.time,
      totalSeconds: stats.time.totalSeconds + sumOf(mine),
      last7Seconds: stats.time.last7Seconds + sumOf(since(mine, addDaysISO(today, -6))),
      days: addToDays(stats.time.days, mine),
    },
  };
}

export function subjectWithStudy(stats: SubjectStats, subjectId: string, overlay: StudyOverlay, today = todayISO()): SubjectStats {
  const mine = overlay.entries.filter((e) => e.subjectId === subjectId || (!e.subjectId && e.noteId && overlay.subjectOf(e.noteId) === subjectId));
  const byNote = new Map<string, number>();
  for (const e of mine) if (e.noteId) byNote.set(e.noteId, (byNote.get(e.noteId) ?? 0) + e.seconds);
  return {
    ...stats,
    time: {
      ...stats.time,
      totalSeconds: stats.time.totalSeconds + sumOf(mine),
      last7Seconds: stats.time.last7Seconds + sumOf(since(mine, addDaysISO(today, -6))),
      days: addToDays(stats.time.days, mine),
      topNotes: stats.time.topNotes
        .map((n) => ({ ...n, seconds: n.seconds + (byNote.get(n.noteId) ?? 0) }))
        .sort((a, b) => b.seconds - a.seconds),
    },
  };
}
