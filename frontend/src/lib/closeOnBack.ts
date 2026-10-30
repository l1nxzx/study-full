import { useEffect, useRef } from "react";

// Lets the system Back button (or the back gesture on phones) close whatever covers the page -
// the assistant, a dialog, the phone menu, an editing mode - instead of navigating the page
// underneath. Opening an overlay adds a history entry for the same URL; Back pops it and closes
// the top-most overlay; closing the overlay any other way removes the entry again.

const MARKER = "__studyOverlay";

interface Entry {
  id: number;
  // Return false to stay open (e.g. to ask about unsaved changes first).
  onBack: () => boolean | void;
}

let nextId = 1;
const stack: Entry[] = [];
let ignoredPops = 0;
let listening = false;

function markerOf(state: unknown): number | undefined {
  return state && typeof state === "object" ? (state as Record<string, number>)[MARKER] : undefined;
}

// Keeps the router's own state (location key and index) so it sees the same location.
function pushEntry(id: number) {
  window.history.pushState({ ...(window.history.state ?? {}), [MARKER]: id }, "");
}

function onPopState(event: PopStateEvent) {
  const landed = markerOf(event.state);
  const ours = ignoredPops > 0;
  if (ours) ignoredPops--;
  // Close overlays down to the entry Back landed on (normally just the top one). Not for our
  // own Back, which only removes the entry of an overlay that already closed.
  while (!ours && stack.length > 0 && stack[stack.length - 1].id !== landed) {
    const entry = stack[stack.length - 1];
    if (entry.onBack() === false) {
      pushEntry(entry.id);
      return;
    }
    stack.pop();
  }
  // An entry left behind by an overlay that closed some other way after the page moved on (a
  // link inside it, a menu that opened a dialog, two overlays closing at once): skip it, so
  // every Back does something visible.
  if (landed !== undefined && !stack.some((e) => e.id === landed)) window.history.back();
}

function openOverlay(onBack: Entry["onBack"]): number {
  if (!listening) {
    window.addEventListener("popstate", onPopState);
    listening = true;
  }
  const id = nextId++;
  stack.push({ id, onBack });
  pushEntry(id);
  return id;
}

function releaseOverlay(id: number) {
  const index = stack.findIndex((e) => e.id === id);
  if (index === -1) return; // Closed by Back: its entry is already gone.
  stack.splice(index, 1);
  // Wait a tick: if the overlay closed because of a navigation, the router has pushed its own
  // entry by then and this one stays behind (skipped later) instead of undoing the navigation.
  setTimeout(() => {
    if (markerOf(window.history.state) === id) {
      ignoredPops++;
      window.history.back();
    }
  }, 0);
}

/**
 * While `open` is true, the system Back closes this overlay (calls `onBack`) instead of
 * leaving the page. `onBack` may return false to stay open.
 */
export function useCloseOnBack(open: boolean, onBack: () => boolean | void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });
  useEffect(() => {
    if (!open) return;
    const id = openOverlay(() => onBackRef.current());
    return () => releaseOverlay(id);
  }, [open]);
}
