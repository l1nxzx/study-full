import { db } from "../config/firebase";
import { AppError } from "../utils/AppError";
import { stripReviewMarkup } from "../utils/noteMarkup";
import type { CreateTestInput, SaveTestAnswersInput } from "../models/test.model";
import * as aiService from "./openai.service";
import { getNoteRaw } from "./notes.service";

const testsCollection = db.collection("tests");
const attemptsCollection = db.collection("testAttempts");

// A grading run that hasn't finished after this long is treated as abandoned (e.g. the
// server restarted mid-request), so the attempt can be graded again.
const GRADING_STALE_MS = 4 * 60 * 1000;

interface StoredQuestion {
  id: string;
  prompt: string;
  points: number;
  estimatedMinutes: number;
  topic: string;
  modelAnswer: string;
  criteria: string[];
}

export interface QuestionGrade {
  id: string;
  awarded: number;
  max: number;
  feedback: string;
  correctAnswer: string;
  toLearn: string;
}

function nowIso() {
  return new Date().toISOString();
}

// Model answers and criteria stay on the server until the attempt has been graded.
function publicQuestion(q: StoredQuestion, reveal: boolean) {
  const base = { id: q.id, prompt: q.prompt, points: q.points, estimatedMinutes: q.estimatedMinutes, topic: q.topic };
  return reveal ? { ...base, modelAnswer: q.modelAnswer, criteria: q.criteria } : base;
}

function attemptSummary(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    testId: data.testId,
    status: data.status as "in_progress" | "grading" | "submitted" | "graded",
    startedAt: data.startedAt,
    updatedAt: data.updatedAt,
    submittedAt: data.submittedAt ?? null,
    gradedAt: data.gradedAt ?? null,
    elapsedSeconds: data.elapsedSeconds ?? 0,
    answeredCount: Object.values((data.answers ?? {}) as Record<string, string>).filter((a) => a.trim()).length,
    totalPoints: data.totalPoints ?? 0,
    awardedPoints: data.awardedPoints ?? null,
    percent: data.percent ?? null,
    gradingError: data.gradingError ?? null,
  };
}

function testSummary(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    title: data.title,
    subjectId: data.subjectId ?? null,
    noteIds: data.noteIds,
    noteTitles: data.noteTitles ?? [],
    settings: data.settings,
    questionCount: (data.questions ?? []).length,
    totalPoints: data.totalPoints,
    estimatedMinutes: data.estimatedMinutes,
    createdAt: data.createdAt,
  };
}

async function getOwnedTest(userId: string, id: string) {
  const doc = await testsCollection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) throw AppError.notFound("test");
  return doc;
}

async function getOwnedAttempt(userId: string, id: string) {
  const doc = await attemptsCollection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) throw AppError.notFound("attempt");
  return doc;
}

async function listAttemptDocs(userId: string) {
  const snapshot = await attemptsCollection.where("userId", "==", userId).get();
  return snapshot.docs;
}

export async function listTests(userId: string) {
  const [testsSnap, attemptDocs] = await Promise.all([
    testsCollection.where("userId", "==", userId).get(),
    listAttemptDocs(userId),
  ]);
  const attemptsByTest = new Map<string, ReturnType<typeof attemptSummary>[]>();
  for (const doc of attemptDocs) {
    const a = attemptSummary(doc.id, doc.data());
    const list = attemptsByTest.get(a.testId) ?? [];
    list.push(a);
    attemptsByTest.set(a.testId, list);
  }
  return testsSnap.docs
    .map((doc) => {
      const attempts = (attemptsByTest.get(doc.id) ?? []).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
      const graded = attempts.filter((a) => a.status === "graded");
      return {
        ...testSummary(doc.id, doc.data()),
        attemptCount: attempts.length,
        gradedCount: graded.length,
        bestPercent: graded.length ? Math.max(...graded.map((a) => a.percent ?? 0)) : null,
        lastPercent: graded[0]?.percent ?? null,
        openAttemptId: attempts.find((a) => a.status !== "graded")?.id ?? null,
        lastActivityAt: attempts[0]?.updatedAt ?? doc.data().createdAt,
      };
    })
    .sort((a, b) => String(b.lastActivityAt).localeCompare(String(a.lastActivityAt)));
}

export async function getTest(userId: string, id: string) {
  const doc = await getOwnedTest(userId, id);
  const data = doc.data()!;
  const attemptsSnap = await attemptsCollection.where("userId", "==", userId).where("testId", "==", id).get();
  const attempts = attemptsSnap.docs
    .map((d) => attemptSummary(d.id, d.data()))
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  return {
    ...testSummary(doc.id, data),
    questions: (data.questions as StoredQuestion[]).map((q) => publicQuestion(q, false)),
    attempts,
  };
}

async function loadNotes(userId: string, noteIds: string[]) {
  return Promise.all(noteIds.map((id) => getNoteRaw(userId, id)));
}

export async function createTest(userId: string, input: CreateTestInput) {
  const notes = await loadNotes(userId, input.noteIds);
  const generated = await aiService.generateTest(
    notes.map((n) => ({ title: n.title, contentMarkdown: stripReviewMarkup(n.contentMarkdown) })),
    input.settings
  );

  const questions: StoredQuestion[] = generated.questions.map((q, i) => ({
    id: `q${i + 1}`,
    prompt: q.prompt,
    points: q.points,
    estimatedMinutes: Math.round(q.estimatedMinutes * 2) / 2,
    topic: q.topic,
    modelAnswer: q.modelAnswer,
    criteria: q.criteria,
  }));

  const subjectIds = [...new Set(notes.map((n) => n.subjectId).filter(Boolean))];
  const docRef = testsCollection.doc();
  const payload = {
    userId,
    title: input.title || generated.title,
    subjectId: subjectIds.length === 1 ? subjectIds[0] : null,
    noteIds: input.noteIds,
    noteTitles: notes.map((n) => n.title),
    settings: input.settings,
    questions,
    totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
    estimatedMinutes: Math.round(questions.reduce((sum, q) => sum + q.estimatedMinutes, 0)),
    createdAt: nowIso(),
  };
  await docRef.set(payload);
  return { ...testSummary(docRef.id, payload), questions: questions.map((q) => publicQuestion(q, false)), attempts: [] };
}

export async function deleteTest(userId: string, id: string) {
  const doc = await getOwnedTest(userId, id);
  const attempts = await attemptsCollection.where("userId", "==", userId).where("testId", "==", id).get();
  const batch = db.batch();
  attempts.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc.ref);
  await batch.commit();
}

// Returns the test's unfinished attempt if there is one (so a refresh or a second device
// picks up where you left off), otherwise starts a new one.
export async function startAttempt(userId: string, testId: string) {
  const test = await getOwnedTest(userId, testId);
  const existing = await attemptsCollection.where("userId", "==", userId).where("testId", "==", testId).get();
  const open = existing.docs.find((d) => d.data().status !== "graded");
  if (open) return getAttempt(userId, open.id);

  const now = nowIso();
  const docRef = attemptsCollection.doc();
  await docRef.set({
    userId,
    testId,
    subjectId: test.data()!.subjectId ?? null,
    noteIds: test.data()!.noteIds,
    status: "in_progress",
    answers: {},
    elapsedSeconds: 0,
    totalPoints: test.data()!.totalPoints,
    startedAt: now,
    updatedAt: now,
  });
  return getAttempt(userId, docRef.id);
}

export async function getAttempt(userId: string, id: string) {
  const doc = await getOwnedAttempt(userId, id);
  const data = doc.data()!;
  const testDoc = await getOwnedTest(userId, data.testId);
  const test = testDoc.data()!;
  const graded = data.status === "graded";
  return {
    ...attemptSummary(doc.id, data),
    answers: (data.answers ?? {}) as Record<string, string>,
    grading: graded ? data.grading : null,
    test: {
      ...testSummary(testDoc.id, test),
      questions: (test.questions as StoredQuestion[]).map((q) => publicQuestion(q, graded)),
    },
  };
}

export async function saveAnswers(userId: string, id: string, input: SaveTestAnswersInput) {
  const doc = await getOwnedAttempt(userId, id);
  const data = doc.data()!;
  if (data.status !== "in_progress") {
    throw AppError.conflict("This attempt has already been submitted.", "ATTEMPT_SUBMITTED");
  }
  const patch = {
    answers: input.answers,
    ...(input.elapsedSeconds !== undefined ? { elapsedSeconds: Math.max(data.elapsedSeconds ?? 0, input.elapsedSeconds) } : {}),
    updatedAt: nowIso(),
  };
  await doc.ref.update(patch);
  return attemptSummary(doc.id, { ...data, ...patch });
}

type GradedResult = Awaited<ReturnType<typeof aiService.gradeTest>>["results"][number];

// Points for one answer. The grader lists, per criterion, the part of the answer that meets it;
// when every criterion is met and nothing in the answer is wrong, the answer gets full points
// whatever number the model put down, so a correct answer can't lose points to a slip.
export function finalAward(q: { points: number }, r: GradedResult) {
  const allMet = r.checks.length > 0 && r.checks.every((c) => c.status === "met") && r.errors.length === 0;
  if (allMet) return { awarded: q.points, toLearn: "" };
  return { awarded: Math.min(q.points, Math.max(0, roundToHalf(r.awarded))), toLearn: r.toLearn };
}

function roundToHalf(n: number) {
  return Math.round(n * 2) / 2;
}

// Submitting locks the answers and grades them. If grading fails (AI unavailable, bad
// response), the attempt stays locked with an error and can simply be submitted again.
// Hands in an attempt and grades it. With `regrade`, an already graded attempt is graded again
// from the same answers. It stays "graded" (with its earlier result) until the new grade is
// written, so a failed or interrupted regrade changes nothing.
export async function submitAttempt(userId: string, id: string, input?: SaveTestAnswersInput, options: { regrade?: boolean } = {}) {
  const doc = await getOwnedAttempt(userId, id);
  const data = doc.data()!;

  if (options.regrade && data.status !== "graded") {
    throw AppError.conflict("Only a graded test can be graded again.", "ATTEMPT_NOT_GRADED");
  }
  if (data.status === "graded" && !options.regrade) return getAttempt(userId, id);
  if (data.status === "grading" && Date.now() - Date.parse(data.gradingStartedAt ?? 0) < GRADING_STALE_MS) {
    throw AppError.conflict("This test is already being graded.", "ATTEMPT_GRADING");
  }

  const answers: Record<string, string> = data.status === "in_progress" && input ? input.answers : data.answers ?? {};
  const now = nowIso();
  if (!options.regrade) {
    await doc.ref.update({
      answers,
      status: "grading",
      gradingStartedAt: now,
      submittedAt: data.submittedAt ?? now,
      updatedAt: now,
      ...(input?.elapsedSeconds !== undefined ? { elapsedSeconds: Math.max(data.elapsedSeconds ?? 0, input.elapsedSeconds) } : {}),
    });
  }

  try {
    const testDoc = await getOwnedTest(userId, data.testId);
    const test = testDoc.data()!;
    const questions = test.questions as StoredQuestion[];
    const answered = questions.filter((q) => (answers[q.id] ?? "").trim());

    let aiResult: Awaited<ReturnType<typeof aiService.gradeTest>> | null = null;
    if (answered.length > 0) {
      const notes = await loadNotes(userId, test.noteIds).catch(() => []);
      aiResult = await aiService.gradeTest(
        notes.map((n) => ({ title: n.title, contentMarkdown: stripReviewMarkup(n.contentMarkdown) })),
        answered.map((q) => ({ ...q, answer: answers[q.id] }))
      );
    }

    const byId = new Map((aiResult?.results ?? []).map((r) => [r.id, r]));
    const results: QuestionGrade[] = questions.map((q) => {
      const answer = (answers[q.id] ?? "").trim();
      const r = byId.get(q.id);
      if (!answer) {
        return { id: q.id, awarded: 0, max: q.points, feedback: "", correctAnswer: q.modelAnswer, toLearn: "" };
      }
      if (!r) {
        throw AppError.serviceUnavailable("The AI skipped some answers while grading. Please try again.", "AI_BAD_RESPONSE");
      }
      return {
        id: q.id,
        ...finalAward(q, r),
        max: q.points,
        feedback: r.feedback,
        correctAnswer: r.correctAnswer || q.modelAnswer,
      };
    });

    const awardedPoints = results.reduce((sum, r) => sum + r.awarded, 0);
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const grading = {
      results,
      summary: aiResult?.summary ?? "",
      strengths: aiResult?.strengths ?? [],
      toReview: aiResult?.toReview ?? questions.map((q) => q.topic).filter(Boolean),
    };
    const gradedAt = nowIso();
    await doc.ref.update({
      status: "graded",
      grading,
      awardedPoints,
      totalPoints,
      percent: totalPoints ? Math.round((awardedPoints / totalPoints) * 1000) / 10 : 0,
      gradedAt,
      gradingError: null,
      updatedAt: gradedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Grading failed";
    if (!options.regrade) await doc.ref.update({ status: "submitted", gradingError: message, updatedAt: nowIso() });
    throw err;
  }

  return getAttempt(userId, id);
}

export async function deleteAttempt(userId: string, id: string) {
  const doc = await getOwnedAttempt(userId, id);
  await doc.ref.delete();
}
