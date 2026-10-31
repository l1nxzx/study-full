import { mainNavItems } from "@/lib/nav";

// The app's own list of the pages visited in this tab, so the back control can name the page the
// user came from. Kept in sessionStorage, so it survives a reload together with the browser's
// history. The browser's history index says whether there is anything to go back to.

interface Entry {
  key: string;
  pathname: string;
}

const STORAGE_KEY = "study.navStack";
// Sign-in pages: going back to them would only bounce the user to the app again.
const SIGN_IN_PAGES = /^\/(login|register)(\/|$)/;

function load(): Entry[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

let stack: Entry[] = load();

function save() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    // Storage can be blocked; the stack then restarts with each load.
  }
}

/**
 * Called once at startup. A new browser entry (index 0, typed in or opened fresh) starts a new
 * list; a reload keeps the one saved in this tab.
 */
export function startNavigation(location: { key: string; pathname: string }, browserIndex: number) {
  if (browserIndex <= 0) {
    stack = [{ key: location.key, pathname: location.pathname }];
    save();
  } else {
    recordNavigation(location, "PUSH");
  }
}

/** Called by the router on every location change. */
export function recordNavigation(location: { key: string; pathname: string }, action: "POP" | "PUSH" | "REPLACE") {
  const entry = { key: location.key, pathname: location.pathname };
  const index = stack.findIndex((e) => e.key === entry.key);
  if (index !== -1) stack = stack.slice(0, index + 1);
  else if (action === "REPLACE" && stack.length > 0) stack = [...stack.slice(0, -1), entry];
  else stack = [...stack, entry];
  save();
}

/** Where a back step leads, in the app's own words, or null when there is nothing to go back to. */
export function backTarget(): { label: string } | null {
  if (stack.length < 2) return null;
  const previous = stack[stack.length - 2].pathname;
  if (previous && SIGN_IN_PAGES.test(previous)) return null;
  return { label: labelFor(previous) };
}

// Specific pages first, so that e.g. a note is not named after its section.
function labelFor(pathname: string): string {
  if (pathname === "/notes/new") return "New note";
  if (/^\/notes\/[^/]+(\/read)?$/.test(pathname)) return "Note";
  if (pathname === "/tests/new") return "New test";
  if (pathname.startsWith("/tests/attempts/")) return "Test try";
  if (/^\/tests\/[^/]+$/.test(pathname)) return "Test";
  if (pathname.startsWith("/subjects/")) return "Subject";
  if (pathname.startsWith("/class-sessions/")) return "Class";
  if (pathname === "/admin") return "Admin";
  const section = mainNavItems.find((item) => pathname === item.to);
  if (section) return section.label;
  if (pathname === "/settings") return "Settings";
  if (pathname === "/profile") return "Profile";
  return "Back";
}
