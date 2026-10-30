import type { TestSettings } from "./openai.service";

// The shape of a test is decided here, not by the AI: how many questions, what kind of thinking
// each one asks for, which are problems to reason through, and how many minutes and points each
// is worth. The AI then writes questions to fit these slots, so every setting has a predictable
// effect. frontend/src/lib/testPlan.ts mirrors the counting for the estimate on the New test page.

export type QuestionKind = "recall" | "understanding" | "deep";

export interface QuestionSlot {
  kind: QuestionKind;
  problem: boolean;
  minutes: number;
  points: number;
}

// Minutes a well-prepared student needs for one question of each kind at medium difficulty.
const KIND_MINUTES: Record<QuestionKind, number> = { recall: 1.5, understanding: 2.25, deep: 3.25 };
// A problem to work through takes a quarter longer than a plain written answer of the same kind.
const PROBLEM_FACTOR = 1.25;
const DIFFICULTY_FACTOR: Record<TestSettings["difficulty"], number> = { easy: 0.85, medium: 1, hard: 1.1, very_hard: 1.2 };

// What share of the questions asks for each kind of thinking.
const KIND_MIX: Record<TestSettings["thinking"], Record<QuestionKind, number>> = {
  recall: { recall: 0.7, understanding: 0.3, deep: 0 },
  understanding: { recall: 0.2, understanding: 0.6, deep: 0.2 },
  deep: { recall: 0, understanding: 0.3, deep: 0.7 },
};
// What share of the questions are problems to reason through.
const PROBLEM_SHARE: Record<TestSettings["logic"], number> = { low: 0.1, medium: 0.35, high: 0.6 };

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 40;

type PlanSettings = Pick<TestSettings, "difficulty" | "thinking" | "logic" | "durationMinutes">;

export function questionCount(s: PlanSettings): number {
  const mix = KIND_MIX[s.thinking];
  const plain = (Object.keys(mix) as QuestionKind[]).reduce((sum, k) => sum + mix[k] * KIND_MINUTES[k], 0);
  const average = plain * (1 + (PROBLEM_FACTOR - 1) * PROBLEM_SHARE[s.logic]) * DIFFICULTY_FACTOR[s.difficulty];
  return Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Math.round(s.durationMinutes / average)));
}

// Splits n into whole parts proportional to the shares (largest remainder).
function apportion<K extends string>(n: number, shares: Record<K, number>): Record<K, number> {
  const keys = Object.keys(shares) as K[];
  const exact = keys.map((k) => n * shares[k]);
  const out = Object.fromEntries(keys.map((k, i) => [k, Math.floor(exact[i])])) as Record<K, number>;
  let left = n - keys.reduce((sum, k) => sum + out[k], 0);
  const byRemainder = keys.map((k, i) => ({ k, r: exact[i] - Math.floor(exact[i]) })).sort((a, b) => b.r - a.r);
  for (const { k } of byRemainder) {
    if (left-- <= 0) break;
    out[k] += 1;
  }
  return out;
}

export function kindCounts(s: PlanSettings) {
  const n = questionCount(s);
  return { total: n, kinds: apportion(n, KIND_MIX[s.thinking]), problems: Math.round(n * PROBLEM_SHARE[s.logic]) };
}

export function planTest(s: PlanSettings): QuestionSlot[] {
  const { kinds, problems } = kindCounts(s);
  const order: QuestionKind[] = ["recall", "understanding", "deep"];
  const slots = order.flatMap((kind) => Array.from({ length: kinds[kind] }, () => ({ kind, problem: false, minutes: 0, points: 0 })));

  // Problems go to the most demanding questions first, which is where reasoning belongs.
  for (let i = slots.length - 1, left = problems; i >= 0 && left > 0; i--, left--) slots[i].problem = true;

  // Minutes in proportion to the work, scaled so the whole test fills the chosen length.
  const weights = slots.map((q) => KIND_MINUTES[q.kind] * (q.problem ? PROBLEM_FACTOR : 1));
  const scale = s.durationMinutes / weights.reduce((a, b) => a + b, 0);
  slots.forEach((q, i) => (q.minutes = Math.max(1, Math.round(weights[i] * scale * 2) / 2)));
  // Rounding leaves the total a few half minutes off; spread the difference over the longest questions.
  let drift = s.durationMinutes - slots.reduce((sum, q) => sum + q.minutes, 0);
  const longestFirst = [...slots].sort((a, b) => b.minutes - a.minutes);
  for (let i = 0; Math.abs(drift) >= 0.5 && i < longestFirst.length * 40; i++) {
    const q = longestFirst[i % longestFirst.length];
    const step = drift > 0 ? 0.5 : -0.5;
    if (q.minutes + step < 1) continue;
    q.minutes += step;
    drift -= step;
  }

  slots.forEach((q) => (q.points = Math.min(20, Math.max(1, Math.round(q.minutes)))));
  // Easier questions first, as on a real test.
  return slots.sort((a, b) => a.minutes - b.minutes);
}
