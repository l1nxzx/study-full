import type { TestSettings } from "@/api/tests";

// Mirrors backend/src/services/testPlan.ts, so the New test page can show the test the
// settings will produce. Keep the numbers in sync with the backend.

type QuestionKind = "recall" | "understanding" | "deep";

const KIND_MINUTES: Record<QuestionKind, number> = { recall: 2, understanding: 3.5, deep: 5 };
const PROBLEM_FACTOR = 1.25;
const DIFFICULTY_FACTOR: Record<TestSettings["difficulty"], number> = { easy: 0.85, medium: 1, hard: 1.1, very_hard: 1.2 };
const KIND_MIX: Record<TestSettings["thinking"], Record<QuestionKind, number>> = {
  recall: { recall: 0.7, understanding: 0.3, deep: 0 },
  understanding: { recall: 0.2, understanding: 0.6, deep: 0.2 },
  deep: { recall: 0, understanding: 0.3, deep: 0.7 },
};
const PROBLEM_SHARE: Record<TestSettings["logic"], number> = { low: 0.1, medium: 0.35, high: 0.6 };

type PlanSettings = Pick<TestSettings, "difficulty" | "thinking" | "logic" | "durationMinutes">;

export const KIND_LABELS: Record<QuestionKind, string> = { recall: "recall", understanding: "understanding", deep: "deep thinking" };

export function questionCount(s: PlanSettings): number {
  const mix = KIND_MIX[s.thinking];
  const plain = (Object.keys(mix) as QuestionKind[]).reduce((sum, k) => sum + mix[k] * KIND_MINUTES[k], 0);
  const average = plain * (1 + (PROBLEM_FACTOR - 1) * PROBLEM_SHARE[s.logic]) * DIFFICULTY_FACTOR[s.difficulty];
  return Math.min(40, Math.max(3, Math.round(s.durationMinutes / average)));
}

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

/** e.g. { total: 8, parts: ["6 deep thinking", "2 understanding"], problems: 3 } */
export function describePlan(s: PlanSettings) {
  const total = questionCount(s);
  const kinds = apportion(total, KIND_MIX[s.thinking]);
  const parts = (["deep", "understanding", "recall"] as QuestionKind[]).filter((k) => kinds[k] > 0).map((k) => `${kinds[k]} ${KIND_LABELS[k]}`);
  return { total, parts, problems: Math.round(total * PROBLEM_SHARE[s.logic]) };
}
