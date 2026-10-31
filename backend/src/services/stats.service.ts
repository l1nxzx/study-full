import { inUserQueue, nextStamp } from "../utils/userQueue";
import { cachedStatsAnswer } from "../utils/statsCache";
import { db } from "../config/firebase";
import type { QuizQuestion } from "../models/ai.model";
import type { QuizAnswer } from "../models/quizAttempt.model";
import { isAnswerCorrect } from "./quizAttempts.service";

// Everything here is read per user and aggregated in memory: a single student's data is
// small, and it keeps Firestore free of composite indexes.

type Counts = Record<string, number>;

interface DayDoc {
  date: string;
  seconds: number;
  byArea: Counts;
  bySubject: Counts;
  byNote: Counts;
  byTest: Counts;
}

interface SessionDoc {
  id: string;
  date: string;
  startedAt: string;
  lastActiveAt: string;
  seconds: number;
  byArea: Counts;
  bySubject: Counts;
  byNote: Counts;
}

function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function sumInto(target: Counts, source: Counts | undefined) {
  for (const [k, v] of Object.entries(source ?? {})) target[k] = (target[k] ?? 0) + v;
}

// Longest lists the statistics send to the app (recent sessions, most studied notes). Lists grow
// with use; a fixed cap keeps the response and the page small.
export const STATS_LIST_LIMIT = 6;

function topEntries(counts: Counts, limit: number) {
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function dailySeries(days: DayDoc[], today: string, length: number, pick: (d: DayDoc) => number) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return Array.from({ length }, (_, i) => {
    const date = addDays(today, i - length + 1);
    const day = byDate.get(date);
    return { date, seconds: day ? pick(day) : 0 };
  });
}

function sumSince(days: DayDoc[], from: string, pick: (d: DayDoc) => number) {
  return days.filter((d) => d.date >= from).reduce((sum, d) => sum + pick(d), 0);
}

function localHour(iso: string, tzOffsetMinutes: number): number {
  const ms = Date.parse(iso) - tzOffsetMinutes * 60 * 1000;
  return new Date(ms).getUTCHours();
}

async function loadAll(userId: string) {
  const byUser = (name: string) => db.collection(name).where("userId", "==", userId);
  const [days, sessions, quizzes, attempts, tests, conversations, notes, subjects] = await Promise.all([
    byUser("activityDays").get(),
    byUser("studySessions").get(),
    byUser("quizAttempts").get(),
    byUser("testAttempts").select("testId", "subjectId", "noteIds", "status", "percent", "awardedPoints", "totalPoints", "gradedAt", "startedAt", "grading").get(),
    byUser("tests").select("title", "subjectId", "noteIds", "questions").get(),
    byUser("conversations").select("noteId", "subjectId", "questionCount", "messageCount", "title", "updatedAt").get(),
    byUser("notes").select("title", "subjectId").get(),
    byUser("subjects").select("name", "color").get(),
  ]);

  return {
    days: days.docs.map((d) => {
      const x = d.data();
      return { date: x.date, seconds: x.seconds ?? 0, byArea: x.byArea ?? {}, bySubject: x.bySubject ?? {}, byNote: x.byNote ?? {}, byTest: x.byTest ?? {} } as DayDoc;
    }),
    sessions: sessions.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionDoc),
    quizzes: quizzes.docs.map((d) => ({ id: d.id, ...d.data() }) as any),
    attempts: attempts.docs.map((d) => ({ id: d.id, ...d.data() }) as any),
    tests: new Map(tests.docs.map((d) => [d.id, d.data() as any])),
    conversations: conversations.docs.map((d) => ({ id: d.id, ...d.data() }) as any),
    notes: new Map(notes.docs.map((d) => [d.id, d.data() as { title: string; subjectId: string }])),
    subjects: new Map(subjects.docs.map((d) => [d.id, d.data() as { name: string; color: string | null }])),
  };
}

type Data = Awaited<ReturnType<typeof loadAll>>;

function quizStats(data: Data, filter: (q: any) => boolean) {
  const completed = data.quizzes.filter((q) => q.status === "completed" && filter(q));
  let answered = 0;
  let correct = 0;
  const missed: { attemptId: string; noteId: string; noteTitle: string; question: string; at: string }[] = [];
  for (const q of completed) {
    const questions = (q.questions ?? []) as QuizQuestion[];
    const answers = (q.answers ?? []) as QuizAnswer[];
    questions.forEach((question, i) => {
      if (!answers[i]?.checked) return;
      answered++;
      if (isAnswerCorrect(question, answers[i])) correct++;
      else missed.push({ attemptId: q.id, noteId: q.noteId, noteTitle: q.title, question: question.question, at: q.completedAt ?? q.updatedAt });
    });
  }
  return {
    completed: completed.length,
    inProgress: data.quizzes.filter((q) => q.status !== "completed" && filter(q)).length,
    answered,
    correct,
    accuracy: answered ? Math.round((correct / answered) * 1000) / 10 : null,
    recent: completed
      .sort((a, b) => String(b.completedAt ?? b.updatedAt).localeCompare(String(a.completedAt ?? a.updatedAt)))
      .slice(0, 8)
      .map((q) => ({ id: q.id, noteId: q.noteId, title: q.title, score: q.score, total: q.total, completedAt: q.completedAt ?? q.updatedAt })),
    missed: missed.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10),
  };
}

function testStats(data: Data, filter: (a: any) => boolean) {
  const graded = data.attempts.filter((a) => a.status === "graded" && filter(a));
  const topics: Counts = {};
  for (const a of graded) {
    for (const t of (a.grading?.toReview ?? []) as string[]) {
      const key = t.trim();
      if (key) topics[key] = (topics[key] ?? 0) + 1;
    }
  }
  const percents = graded.map((a) => a.percent ?? 0);
  return {
    graded: graded.length,
    averagePercent: percents.length ? Math.round((percents.reduce((s, p) => s + p, 0) / percents.length) * 10) / 10 : null,
    bestPercent: percents.length ? Math.max(...percents) : null,
    recent: graded
      .sort((a, b) => String(b.gradedAt).localeCompare(String(a.gradedAt)))
      .slice(0, 8)
      .map((a) => ({
        attemptId: a.id,
        testId: a.testId,
        title: data.tests.get(a.testId)?.title ?? "Deleted test",
        percent: a.percent,
        awardedPoints: a.awardedPoints,
        totalPoints: a.totalPoints,
        gradedAt: a.gradedAt,
      })),
    toReview: topEntries(topics, 8).map(([topic, count]) => ({ topic, count })),
  };
}

function assistantStats(data: Data, filter: (c: any) => boolean) {
  const convs = data.conversations.filter(filter);
  return {
    conversations: convs.length,
    questionsAsked: convs.reduce((s, c) => s + (c.questionCount ?? 0), 0),
  };
}

function sessionView(s: SessionDoc, data: Data) {
  const mainArea = topEntries(s.byArea ?? {}, 1)[0]?.[0] ?? "other";
  return {
    id: s.id,
    startedAt: s.startedAt,
    lastActiveAt: s.lastActiveAt,
    seconds: s.seconds ?? 0,
    mainArea,
    byArea: s.byArea ?? {},
    notes: topEntries(s.byNote ?? {}, 3).map(([noteId, seconds]) => ({ noteId, title: data.notes.get(noteId)?.title ?? "Deleted note", seconds })),
    subjects: topEntries(s.bySubject ?? {}, 6)
      .filter(([subjectId]) => data.subjects.has(subjectId))
      .slice(0, 3)
      .map(([subjectId, seconds]) => ({ subjectId, name: data.subjects.get(subjectId)!.name, seconds })),
  };
}

export function overview(userId: string, today: string, tzOffsetMinutes: number) {
  // Read in the user's queue, so the answer says exactly which study updates it includes (asOf).
  return cachedStatsAnswer(userId, `overview|${today}|${tzOffsetMinutes}`, () =>
    inUserQueue(userId, async () => {
      const asOf = nextStamp();
      return { ...(await overviewData(userId, today, tzOffsetMinutes)), asOf };
    })
  );
}

async function overviewData(userId: string, today: string, tzOffsetMinutes: number) {
  const data = await loadAll(userId);
  const total = (d: DayDoc) => d.seconds;

  const byArea: Counts = {};
  const bySubject: Counts = {};
  const byNote: Counts = {};
  for (const d of data.days) {
    sumInto(byArea, d.byArea);
    sumInto(bySubject, d.bySubject);
    sumInto(byNote, d.byNote);
  }

  const sessions = [...data.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const sessionSeconds = sessions.map((s) => s.seconds ?? 0);
  const byHour = Array.from({ length: 24 }, () => 0);
  const byWeekday = Array.from({ length: 7 }, () => 0);
  for (const s of sessions) {
    byHour[localHour(s.startedAt, tzOffsetMinutes)] += s.seconds ?? 0;
  }
  for (const d of data.days) {
    byWeekday[new Date(`${d.date}T12:00:00Z`).getUTCDay()] += d.seconds;
  }

  const activeDates = new Set(data.days.filter((d) => d.seconds > 0).map((d) => d.date));

  return {
    time: {
      totalSeconds: data.days.reduce((s, d) => s + d.seconds, 0),
      todaySeconds: sumSince(data.days.filter((d) => d.date === today), today, total),
      last7Seconds: sumSince(data.days, addDays(today, -6), total),
      last30Seconds: sumSince(data.days, addDays(today, -29), total),
      activeDays: activeDates.size,
      firstDate: [...activeDates].sort()[0] ?? null,
      days: dailySeries(data.days, today, 30, total),
      byArea,
      byHour,
      byWeekday,
      // Only subjects that still exist: time spent on a deleted one stays in the totals, but a
      // subject you deleted isn't listed.
      bySubject: topEntries(
        Object.fromEntries(Object.entries(bySubject).filter(([subjectId]) => data.subjects.has(subjectId))),
        12
      ).map(([subjectId, seconds]) => ({
        subjectId,
        name: data.subjects.get(subjectId)!.name,
        color: data.subjects.get(subjectId)?.color ?? null,
        seconds,
      })),
      // Only notes that still exist, capped to the list length on the profile page.
      topNotes: topEntries(
        Object.fromEntries(Object.entries(byNote).filter(([noteId]) => data.notes.has(noteId))),
        STATS_LIST_LIMIT
      ).map(([noteId, seconds]) => ({ noteId, title: data.notes.get(noteId)!.title, subjectId: data.notes.get(noteId)!.subjectId, seconds })),
    },
    sessions: {
      count: sessions.length,
      averageSeconds: sessionSeconds.length ? Math.round(sessionSeconds.reduce((s, v) => s + v, 0) / sessionSeconds.length) : 0,
      longestSeconds: sessionSeconds.length ? Math.max(...sessionSeconds) : 0,
      recent: sessions.slice(0, STATS_LIST_LIMIT).map((s) => sessionView(s, data)),
    },
    quizzes: quizStats(data, () => true),
    tests: testStats(data, () => true),
    assistant: assistantStats(data, () => true),
    counts: { notes: data.notes.size, subjects: data.subjects.size, tests: data.tests.size },
  };
}

export function noteStats(userId: string, noteId: string, today: string) {
  // Read in the user's queue, so the answer says exactly which study updates it includes (asOf).
  return cachedStatsAnswer(userId, `note|${noteId}|${today}`, () =>
    inUserQueue(userId, async () => {
      const asOf = nextStamp();
      return { ...(await noteStatsData(userId, noteId, today)), asOf };
    })
  );
}

async function noteStatsData(userId: string, noteId: string, today: string) {
  const data = await loadAll(userId);
  const pick = (d: DayDoc) => d.byNote?.[noteId] ?? 0;
  const studiedDates = data.days.filter((d) => pick(d) > 0).map((d) => d.date).sort();
  const sessions = data.sessions.filter((s) => (s.byNote?.[noteId] ?? 0) > 0);
  const testIds = new Set([...data.tests.entries()].filter(([, t]) => (t.noteIds ?? []).includes(noteId)).map(([id]) => id));

  return {
    time: {
      totalSeconds: data.days.reduce((s, d) => s + pick(d), 0),
      last7Seconds: sumSince(data.days, addDays(today, -6), pick),
      days: dailySeries(data.days, today, 30, pick),
      firstStudied: studiedDates[0] ?? null,
      lastStudied: studiedDates[studiedDates.length - 1] ?? null,
    },
    sessions: sessions.length,
    quizzes: quizStats(data, (q) => (q.noteIds ?? []).includes(noteId)),
    tests: { ...testStats(data, (a) => testIds.has(a.testId)), count: testIds.size },
    assistant: assistantStats(data, (c) => c.noteId === noteId),
  };
}

export function subjectStats(userId: string, subjectId: string, today: string) {
  // Read in the user's queue, so the answer says exactly which study updates it includes (asOf).
  return cachedStatsAnswer(userId, `subject|${subjectId}|${today}`, () =>
    inUserQueue(userId, async () => {
      const asOf = nextStamp();
      return { ...(await subjectStatsData(userId, subjectId, today)), asOf };
    })
  );
}

async function subjectStatsData(userId: string, subjectId: string, today: string) {
  const data = await loadAll(userId);
  const pick = (d: DayDoc) => d.bySubject?.[subjectId] ?? 0;
  const byNote: Counts = {};
  for (const d of data.days) {
    for (const [noteId, seconds] of Object.entries(d.byNote ?? {})) {
      if (data.notes.get(noteId)?.subjectId === subjectId) byNote[noteId] = (byNote[noteId] ?? 0) + seconds;
    }
  }
  return {
    time: {
      totalSeconds: data.days.reduce((s, d) => s + pick(d), 0),
      last7Seconds: sumSince(data.days, addDays(today, -6), pick),
      days: dailySeries(data.days, today, 30, pick),
      topNotes: topEntries(byNote, 6).map(([noteId, seconds]) => ({ noteId, title: data.notes.get(noteId)!.title, seconds })),
    },
    sessions: data.sessions.filter((s) => (s.bySubject?.[subjectId] ?? 0) > 0).length,
    quizzes: quizStats(data, (q) => q.subjectId === subjectId),
    tests: testStats(data, (a) => a.subjectId === subjectId),
    assistant: assistantStats(data, (c) => c.subjectId === subjectId),
  };
}
