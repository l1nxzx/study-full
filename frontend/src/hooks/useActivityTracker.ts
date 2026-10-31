import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAiPanel, type AiToolMode } from "@/hooks/useAiPanel";
import { getActivityHint, type ActivityContext } from "@/lib/activity";
import { closeBucket, recordTime, sendQueue, startLedger } from "@/lib/studyLedger";

const TICK_MS = 5000;
// Sent to the server every 15 seconds: it's counted on this device at once, so the server only
// needs to hear about it soon enough for other devices (and the periodic check) to see it.
const SEND_MS = 15_000;
// Without any input for this long the time stops counting (you walked away).
const IDLE_MS = 4 * 60_000;

function contextFor(pathname: string, panelOpen: boolean, toolMode: AiToolMode, activeNoteId: string | undefined): ActivityContext {
  const panelArea = toolMode === "quiz" ? "quiz" : toolMode === "flashcards" ? "flashcards" : "assistant";
  let m = pathname.match(/^\/notes\/([^/]+)\/read$/);
  if (m) return { area: "notebook", noteId: m[1] };
  m = pathname.match(/^\/notes\/([^/]+)$/);
  if (m && m[1] !== "new") return { area: panelOpen ? panelArea : "notes", noteId: m[1] };
  if (panelOpen) return { area: panelArea, ...(activeNoteId ? { noteId: activeNoteId } : {}) };
  if (pathname.startsWith("/notes")) return { area: "notes" };
  m = pathname.match(/^\/tests\/(?!attempts|new)([^/]+)$/);
  if (m) return { area: "tests", testId: m[1] };
  if (pathname.startsWith("/tests")) return { area: "tests" };
  m = pathname.match(/^\/subjects\/([^/]+)$/);
  if (m) return { area: "planning", subjectId: m[1] };
  if (/^\/(dashboard|schedule|tasks|class-sessions)/.test(pathname)) return { area: "planning" };
  return { area: "other" };
}

/**
 * Counts active study time (page visible, and you've interacted with it in the last few
 * minutes) per area, note, subject and test. It's shown on this device at once and sent to the
 * server every 15 seconds (see lib/studyLedger).
 */
export function useActivityTracker() {
  const { pathname } = useLocation();
  const { isOpen, toolMode, activeNote } = useAiPanel();
  const contextRef = useRef<ActivityContext>({ area: "other" });
  contextRef.current = { ...contextFor(pathname, isOpen, toolMode, activeNote?.id), ...(getActivityHint() ?? {}) };

  useEffect(() => {
    let lastInput = Date.now();
    void startLedger();

    const markActive = () => {
      lastInput = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true, capture: true }));

    const tick = setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastInput > IDLE_MS) return;
      recordTime({ ...contextRef.current, ...(getActivityHint() ?? {}) }, TICK_MS / 1000);
    }, TICK_MS);

    const sendTimer = setInterval(() => {
      closeBucket();
      void sendQueue();
    }, SEND_MS);

    const sendNow = (keepalive: boolean) => {
      closeBucket();
      void sendQueue(keepalive);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendNow(true);
      else {
        lastInput = Date.now();
        void sendQueue();
      }
    };
    const onPageHide = () => sendNow(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      sendNow(true);
      clearInterval(tick);
      clearInterval(sendTimer);
      events.forEach((e) => window.removeEventListener(e, markActive, { capture: true }));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);
}
