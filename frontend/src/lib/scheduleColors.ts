// Deterministic color for schedule occurrences that aren't linked to one of the user's
// own Subjects (e.g. an imported EduPage lesson titled "MAT" with no matching Subject) -
// so the schedule still reads as visually distinct at a glance instead of one flat color.
// Also the shared preset palette offered when manually creating/editing a Subject.
// Pastels in the same family as the accent and status colours (oklch L 0.8, C 0.08), so a
// subject's colour sits with the rest of the interface in both themes.
export const SUBJECT_PALETTE = [
  "#aebaf2", // indigo
  "#7fcbde", // cyan
  "#90ceac", // emerald
  "#d9b982", // amber
  "#edaaa4", // red
  "#e8a9c0", // pink
  "#c5b3ea", // violet
  "#adc992", // lime
  "#7fcfc4", // teal
  "#e7b18c", // orange
  "#97c2f0", // blue
  "#d9acda", // fuchsia
];

// The earlier, vivid presets, in the same order. Subjects saved with one show its pastel.
const LEGACY_PALETTE = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#db2777",
  "#7c3aed",
  "#65a30d",
  "#0d9488",
  "#ea580c",
  "#2563eb",
  "#c026d3",
];

/** A stored subject colour as it should be shown: old vivid presets become their pastel. */
export function subjectColor(color: string): string;
export function subjectColor(color: string | null | undefined): string | null | undefined;
export function subjectColor(color: string | null | undefined) {
  if (!color) return color;
  const legacy = LEGACY_PALETTE.indexOf(color.toLowerCase());
  return legacy === -1 ? color : SUBJECT_PALETTE[legacy];
}

export function colorForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

export function firstUnusedColor(usedColors: (string | null | undefined)[]): string {
  const used = new Set(usedColors.filter(Boolean).map((c) => subjectColor(c!).toLowerCase()));
  return SUBJECT_PALETTE.find((c) => !used.has(c.toLowerCase())) ?? SUBJECT_PALETTE[0];
}
