import { useEffect, useState } from "react";

/**
 * Full screen for the whole app (the Fullscreen API). Only browsers that allow it show the
 * control; iPhone and iPad Safari don't, and there an installed app is already full screen.
 * Must start from a tap, which is why it's a button and not automatic.
 */
export function useFullscreen() {
  const supported = typeof document !== "undefined" && document.fullscreenEnabled === true;
  const [isFull, setIsFull] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const sync = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Refused (not from a tap, or the browser doesn't allow it here): nothing changes.
    }
  }

  return { supported, isFull, toggle };
}
