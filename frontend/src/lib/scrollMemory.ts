// Each page keeps its scroll position for the tab's session. Going back (the back button or the
// system back) returns to where the page was, not its top. Only the app's main scroll area is
// remembered; the rest of the page doesn't scroll.

const STORAGE_KEY = "study.scrollPositions";
const MAX_PAGES = 200;

function load(): Record<string, number> {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

let positions = load();
let currentKey = "default";
// Set while a position is being put back, so the page's own scroll events don't overwrite it.
let restoring = false;
let saveTimer: number | undefined;

function save() {
  try {
    const keys = Object.keys(positions);
    if (keys.length > MAX_PAGES) for (const k of keys.slice(0, keys.length - MAX_PAGES)) delete positions[k];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Storage can be blocked; positions then last only while the page is open.
  }
}

/** The app's scroll area, if the current page has one (the notebook view doesn't). */
function scrollArea(): HTMLElement | null {
  return document.getElementById("main");
}

/** Called by the router on every location change, before the new page is drawn. */
export function setScrollPage(key: string) {
  currentKey = key;
}

/** True while a saved position is being put back (the page should not jump to its top). */
export function isRestoringScroll() {
  return restoring;
}

/** Puts the saved position back for this page, once its content is there. */
export function restoreScroll(key: string) {
  const wanted = positions[key];
  if (!wanted) return;
  restoring = true;
  const started = performance.now();
  const step = () => {
    const area = scrollArea();
    if (area) area.scrollTop = wanted;
    const reached = !!area && Math.abs(area.scrollTop - wanted) < 2;
    // Give up after a few seconds (the page never got tall enough, or never loaded).
    if (reached || performance.now() - started > 3000) {
      restoring = false;
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Records the position while the user scrolls the app's scroll area. Capturing at the document
// level catches it without the page having to do anything.
document.addEventListener(
  "scroll",
  (event) => {
    if (restoring || (event.target as HTMLElement).id !== "main") return;
    positions[currentKey] = (event.target as HTMLElement).scrollTop;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(save, 300);
  },
  { capture: true, passive: true }
);
