import type { TestDifficulty, TestLogic, TestSettings, TestThinking } from "@/api/tests";

export const DIFFICULTY_LABELS: Record<TestDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  very_hard: "Very hard",
};

export const THINKING_LABELS: Record<TestThinking, { label: string; description: string }> = {
  recall: { label: "Recall", description: "Definitions, facts and formulas: knowing it." },
  understanding: { label: "Understanding", description: "Explaining why, comparing, applying a rule to a new case." },
  deep: { label: "Deep thinking", description: "Analysing, combining ideas and reasoning in several steps." },
};

export const LOGIC_LABELS: Record<TestLogic, { label: string; description: string }> = {
  low: { label: "Little", description: "Mostly written answers, few problems to work out." },
  medium: { label: "Some", description: "A fair share of calculations, derivations and cause-and-effect." },
  high: { label: "Lots", description: "Mostly problems to reason through: calculations, proofs, derivations." },
};

export const DURATIONS = [15, 30, 45, 60, 90] as const;

export function describeSettings(s: TestSettings): string {
  return `${DIFFICULTY_LABELS[s.difficulty]} · ${THINKING_LABELS[s.thinking].label} · ${LOGIC_LABELS[s.logic].label.toLowerCase()} logic`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return s > 0 ? `${s} s` : "0 min";
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** ok for full marks or close, warn for partial, bad for little or nothing. */
export function scoreTone(ratio: number): "ok" | "warn" | "bad" {
  if (ratio >= 0.85) return "ok";
  if (ratio >= 0.4) return "warn";
  return "bad";
}
