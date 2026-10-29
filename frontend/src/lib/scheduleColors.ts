// Deterministic color for schedule occurrences that aren't linked to one of the user's
// own Subjects (e.g. an imported EduPage lesson titled "MAT" with no matching Subject) -
// so the schedule still reads as visually distinct at a glance instead of one flat color.
// Also the shared preset palette offered when manually creating/editing a Subject.
export const SUBJECT_PALETTE = [
  "#4f46e5", // indigo
  "#0891b2", // cyan
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#db2777", // pink
  "#7c3aed", // violet
  "#65a30d", // lime
  "#0d9488", // teal
  "#ea580c", // orange
  "#2563eb", // blue
  "#c026d3", // fuchsia
];

export function colorForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

export function firstUnusedColor(usedColors: (string | null | undefined)[]): string {
  const used = new Set(usedColors.filter(Boolean).map((c) => c!.toLowerCase()));
  return SUBJECT_PALETTE.find((c) => !used.has(c.toLowerCase())) ?? SUBJECT_PALETTE[0];
}
