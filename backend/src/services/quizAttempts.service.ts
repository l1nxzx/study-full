import { invalidateStatsAnswers } from "../utils/statsCache";
import { db } from "../config/firebase";
import { AppError } from "../utils/AppError";
import type { QuizQuestion } from "../models/ai.model";
import type { CreateQuizAttemptInput, QuizAnswer, UpdateQuizAttemptInput } from "../models/quizAttempt.model";
import { getNoteRaw } from "./notes.service";

const collection = db.collection("quizAttempts");

export function isAnswerCorrect(question: QuizQuestion, answer: QuizAnswer | undefined): boolean {
  if (!answer?.checked) return false;
  if (question.type === "multiple_choice") return answer.selectedIndex === question.correctIndex;
  if (question.type === "true_false") return answer.selectedBool === question.correctAnswer;
  return answer.markedCorrect === true;
}

// The score is always computed here from the stored answers, never trusted from the client.
function scoreOf(questions: QuizQuestion[], answers: QuizAnswer[]) {
  const score = questions.filter((q, i) => isAnswerCorrect(q, answers[i])).length;
  const answered = answers.filter((a) => a?.checked).length;
  return { score, answered, total: questions.length };
}

function toSummary(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    noteId: data.noteId,
    noteIds: data.noteIds,
    subjectId: data.subjectId ?? null,
    title: data.title,
    settings: data.settings,
    status: data.status,
    score: data.score ?? 0,
    answered: data.answered ?? 0,
    total: data.total ?? 0,
    retryOf: data.retryOf ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completedAt: data.completedAt ?? null,
  };
}

export async function listQuizAttempts(userId: string, filters: { noteId?: string } = {}) {
  const snapshot = await collection.where("userId", "==", userId).get();
  return snapshot.docs
    .map((doc) => toSummary(doc.id, doc.data()))
    .filter((q) => !filters.noteId || q.noteIds?.includes(filters.noteId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function getOwned(userId: string, id: string) {
  const doc = await collection.doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) throw AppError.notFound("quiz");
  return doc;
}

export async function getQuizAttempt(userId: string, id: string) {
  const doc = await getOwned(userId, id);
  const data = doc.data()!;
  return { ...toSummary(doc.id, data), questions: data.questions as QuizQuestion[], answers: (data.answers ?? []) as QuizAnswer[] };
}

export async function createQuizAttempt(userId: string, input: CreateQuizAttemptInput) {
  try {
    const note = await getNoteRaw(userId, input.noteIds[0]);
    const now = new Date().toISOString();
    const answers: QuizAnswer[] = input.questions.map(() => ({ checked: false }));
    const docRef = collection.doc();
    const payload = {
      userId,
      noteIds: input.noteIds,
      noteId: input.noteIds[0],
      subjectId: note.subjectId ?? null,
      title: note.title,
      settings: input.settings,
      questions: input.questions,
      answers,
      status: "in_progress",
      ...scoreOf(input.questions, answers),
      retryOf: input.retryOf ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    await docRef.set(payload);
    return { ...toSummary(docRef.id, payload), questions: input.questions, answers };
  } finally {
    invalidateStatsAnswers(userId);
  }
}

export async function updateQuizAttempt(userId: string, id: string, input: UpdateQuizAttemptInput) {
  try {
    const doc = await getOwned(userId, id);
    const data = doc.data()!;
    const questions = data.questions as QuizQuestion[];
    const answers = questions.map((_, i) => input.answers[i] ?? { checked: false });
    const now = new Date().toISOString();
    const completing = input.completed && data.status !== "completed";
    const patch = {
      answers,
      ...scoreOf(questions, answers),
      status: input.completed || data.status === "completed" ? "completed" : "in_progress",
      updatedAt: now,
      ...(completing ? { completedAt: now } : {}),
    };
    await doc.ref.update(patch);
    return { ...toSummary(doc.id, { ...data, ...patch }), questions, answers };
  } finally {
    invalidateStatsAnswers(userId);
  }
}

export async function deleteQuizAttempt(userId: string, id: string) {
  try {
    const doc = await getOwned(userId, id);
    await doc.ref.delete();
  } finally {
    invalidateStatsAnswers(userId);
  }
}
