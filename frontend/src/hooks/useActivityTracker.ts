import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiClient, TOKEN_STORAGE_KEY } from "@/api/client";
import { useAiPanel, type AiToolMode } from "@/hooks/useAiPanel";
import { getActivityHint, type ActivityContext } from "@/lib/activity";
import { todayISO } from "@/lib/date";

const TICK_MS = 5000;
const FLUSH_MS = 60_000;
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

type Bucket = Map<string, ActivityContext & { seconds: number }>;

function send(bucket: Bucket, keepalive: boolean): Promise<void> {
  const entries = [...bucket.values()].filter((e) => e.seconds > 0).slice(0, 40);
  if (entries.length === 0) return Promise.resolve();
  const body = JSON.stringify({ date: todayISO(), entries: entries.map((e) => ({ ...e, seconds: Math.min(900, Math.round(e.seconds)) })) });
  if (keepalive) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    return fetch(`${apiClient.defaults.baseURL}/activity`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body,
    }).then(() => undefined);
  }
  return apiClient.post("/activity", body, { headers: { "Content-Type": "application/json" } }).then(() => undefined);
}

/**
 * Counts active study time (page visible, and you've interacted with it in the last few
 * minutes) per area, note, subject and test, and sends it to the server once a minute.
 * The server turns it into daily totals and study sessions for the statistics pages.
 */
export function useActivityTracker() {
  const { pathname } = useLocation();
  const { isOpen, toolMode, activeNote } = useAiPanel();
  const contextRef = useRef<ActivityContext>({ area: "other" });
  contextRef.current = { ...contextFor(pathname, isOpen, toolMode, activeNote?.id), ...(getActivityHint() ?? {}) };

  useEffect(() => {
    let lastInput = Date.now();
    let bucket: Bucket = new Map();
    let sending = false;

    const markActive = () => {
      lastInput = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true, capture: true }));

    const tick = setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastInput > IDLE_MS) return;
      const ctx = { ...contextRef.current, ...(getActivityHint() ?? {}) };
      const key = `${ctx.area}|${ctx.noteId ?? ""}|${ctx.subjectId ?? ""}|${ctx.testId ?? ""}`;
      const entry = bucket.get(key) ?? { ...ctx, seconds: 0 };
      entry.seconds += TICK_MS / 1000;
      bucket.set(key, entry);
    }, TICK_MS);

    const flush = (keepalive = false) => {
      if (sending || bucket.size === 0) return;
      const outgoing = bucket;
      bucket = new Map();
      sending = true;
      send(outgoing, keepalive)
        .catch(() => {
          // Put it back to try again with the next flush (bounded: the server caps each send).
          for (const [k, v] of outgoing) {
            const cur = bucket.get(k);
            bucket.set(k, cur ? { ...cur, seconds: Math.min(900, cur.seconds + v.seconds) } : v);
          }
        })
        .finally(() => {
          sending = false;
        });
    };

    const flushTimer = setInterval(() => flush(), FLUSH_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
      else markActive();
    };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      flush(true);
      clearInterval(tick);
      clearInterval(flushTimer);
      events.forEach((e) => window.removeEventListener(e, markActive, { capture: true }));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);
}
