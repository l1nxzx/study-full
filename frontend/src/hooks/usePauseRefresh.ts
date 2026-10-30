import { useEffect } from "react";

// Screens holding work that isn't saved yet (note editors, a test in progress) switch pull to
// refresh off, since a refresh can reload the app for a new version.
let holders = 0;

export function isRefreshPaused() {
  return holders > 0;
}

export function usePauseRefresh(active = true) {
  useEffect(() => {
    if (!active) return;
    holders++;
    return () => {
      holders--;
    };
  }, [active]);
}
