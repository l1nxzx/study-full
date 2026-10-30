import type { Preferences, ReadingFont, UiFont } from "@/types";

const CACHE_KEY = "study.prefs";

// Keep these stacks in sync with the inline script in index.html, which applies the cached
// choice before the app renders so there's no flash of the default font.
export const READING_FONTS: Record<ReadingFont, { label: string; description: string; stack: string }> = {
  literata: {
    label: "Literata",
    description: "Study's reading serif, made for long texts.",
    stack: '"Literata Variable", Georgia, Cambria, serif',
  },
  instrument: {
    label: "Instrument Sans",
    description: "The interface font, for a cleaner look.",
    stack: '"Instrument Sans Variable", ui-sans-serif, system-ui, sans-serif',
  },
  "system-serif": {
    label: "System serif",
    description: "Your device's own serif, e.g. Georgia or Times.",
    stack: 'Georgia, "Times New Roman", Times, serif',
  },
  "system-sans": {
    label: "System sans",
    description: "Your device's own font, e.g. San Francisco or Segoe UI.",
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
};

export const UI_FONTS: Record<UiFont, { label: string; stack: string }> = {
  instrument: {
    label: "Instrument Sans",
    stack: '"Instrument Sans Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  system: {
    label: "System",
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
};

export function applyPreferences(prefs: Preferences) {
  const root = document.documentElement.style;
  root.setProperty("--reading-font", READING_FONTS[prefs.readingFont ?? "literata"].stack);
  root.setProperty("--ui-font", UI_FONTS[prefs.uiFont ?? "instrument"].stack);
}

export function readCachedPreferences(): Preferences {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Preferences;
  } catch {
    return {};
  }
}

export function cachePreferences(prefs: Preferences) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable - the server copy still applies on the next load
  }
}
