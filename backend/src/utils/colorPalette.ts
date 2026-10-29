// Shared palette for auto-assigned subject colors (e.g. subjects created automatically
// from an imported EduPage schedule). Picks the first color not already used by one of
// the user's other subjects, so imported subjects never silently collide.
export const SUBJECT_COLOR_PALETTE = [
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
  "#16a34a", // green
  "#ca8a04", // yellow/gold
  "#e11d48", // rose
];

export function pickUnusedColor(usedColors: (string | null | undefined)[]): string {
  const used = new Set(usedColors.filter(Boolean).map((c) => c!.toLowerCase()));
  const free = SUBJECT_COLOR_PALETTE.find((c) => !used.has(c.toLowerCase()));
  if (free) return free;
  // Palette exhausted (15+ subjects) - cycle deterministically rather than repeat the
  // very first color for every subject beyond that point.
  return SUBJECT_COLOR_PALETTE[used.size % SUBJECT_COLOR_PALETTE.length];
}
