import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type RefObject } from "react";
import { isRefreshPaused } from "@/hooks/usePauseRefresh";
import { applyWaitingUpdate, checkForUpdate } from "@/lib/serviceWorker";

const TRIGGER = 72;
const MAX = 120;
const SIZE = 40;
// The spinner's arc: a circle of radius 8.5 in a 24-unit box.
const CIRCUMFERENCE = 2 * Math.PI * 8.5;

/**
 * Pull down at the top of a page to refresh, like Android's: a round spinner follows the finger
 * while the page stays put, its arc grows until a release would refresh, and pushing back up
 * tucks it away again. Reloads the page's data and picks up a new version of the app if one is
 * ready. Touch screens only.
 */
export function PullToRefresh({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) {
  const queryClient = useQueryClient();
  const discRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<SVGSVGElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    // Any touch input counts: a tablet with a keyboard or mouse attached may report a fine
    // primary pointer, and the gesture must still work.
    const touch = navigator.maxTouchPoints > 0 || window.matchMedia("(any-pointer: coarse)").matches;
    if (!scroller || !touch) return;

    let startX = 0;
    let startY = 0;
    let pull = 0;
    // "idle": waiting for a touch; "maybe": touched at the top, direction unknown; "pulling":
    // this gesture is a pull and the page doesn't scroll; "busy": refreshing.
    let phase: "idle" | "maybe" | "pulling" | "busy" = "idle";

    function draw(distance: number, transition = "") {
      const disc = discRef.current;
      const arc = arcRef.current;
      const spinner = spinnerRef.current;
      if (!disc || !arc || !spinner) return;
      const progress = Math.min(1, distance / TRIGGER);
      disc.style.transition = transition;
      disc.style.transform = `translate(-50%, ${distance - SIZE - 4}px) scale(${distance > 0 ? 1 : 0.6})`;
      disc.style.opacity = distance > 0 ? "1" : "0";
      if (phase === "busy") return;
      // The arc grows to most of a circle and turns with the finger; it brightens once a release
      // would refresh.
      arc.style.strokeDasharray = `${progress * 0.8 * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      arc.style.opacity = progress >= 1 ? "1" : "0.55";
      spinner.style.transform = `rotate(${distance * 2.5 - 90}deg)`;
    }

    function settle(distance: number) {
      draw(distance, "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 220ms ease-out");
    }

    function onStart(e: TouchEvent) {
      if (phase === "busy") return;
      const target = e.target as Element;
      const eligible =
        !isRefreshPaused() &&
        e.touches.length === 1 &&
        scroller!.scrollTop <= 0 &&
        !target.closest("input, textarea, select, [contenteditable='true']");
      phase = eligible ? "maybe" : "idle";
      if (!eligible) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pull = 0;
    }

    function onMove(e: TouchEvent) {
      if (phase !== "maybe" && phase !== "pulling") return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (phase === "maybe") {
        if (dy === 0) return;
        // Up, or more sideways than down: an ordinary scroll or swipe. Leave it alone.
        if (dy < 0 || Math.abs(dx) > dy || scroller!.scrollTop > 0) {
          phase = "idle";
          return;
        }
        phase = "pulling";
      }

      // The gesture is ours now: the page stays still, and moving back up only shrinks the pull.
      if (e.cancelable) e.preventDefault();
      // Resistance, so it follows the finger but gets heavier the further it goes.
      pull = Math.max(0, Math.min(MAX, dy * 0.55));
      draw(pull);
    }

    async function onEnd() {
      if (phase !== "pulling") {
        if (phase === "maybe") phase = "idle";
        return;
      }
      if (pull < TRIGGER) {
        phase = "idle";
        settle(0);
        return;
      }
      phase = "busy";
      settle(TRIGGER);
      arcRef.current!.style.strokeDasharray = `${0.75 * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
      arcRef.current!.style.opacity = "1";
      spinnerRef.current!.style.transform = "";
      spinnerRef.current!.classList.add("animate-spin");
      navigator.vibrate?.(8);
      await Promise.allSettled([
        queryClient.refetchQueries({ type: "active" }),
        checkForUpdate(),
        // Keep the spinner up long enough to read as "done".
        new Promise((r) => setTimeout(r, 500)),
      ]);
      if (applyWaitingUpdate()) return;
      // Done: the spinner shrinks away where it is, as on Android.
      const disc = discRef.current!;
      disc.style.transition = "transform 180ms ease-in, opacity 180ms ease-in";
      disc.style.transform = `translate(-50%, ${TRIGGER - SIZE - 4}px) scale(0)`;
      disc.style.opacity = "0";
      await new Promise((r) => setTimeout(r, 200));
      spinnerRef.current!.classList.remove("animate-spin");
      phase = "idle";
      draw(0);
    }

    scroller.addEventListener("touchstart", onStart, { passive: true });
    // Not passive: once a pull starts, it stops the page from scrolling.
    scroller.addEventListener("touchmove", onMove, { passive: false });
    scroller.addEventListener("touchend", onEnd);
    scroller.addEventListener("touchcancel", onEnd);
    return () => {
      scroller.removeEventListener("touchstart", onStart);
      scroller.removeEventListener("touchmove", onMove);
      scroller.removeEventListener("touchend", onEnd);
      scroller.removeEventListener("touchcancel", onEnd);
    };
  }, [scrollRef, queryClient]);

  return (
    <div
      ref={discRef}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-0 z-30 flex items-center justify-center rounded-full bg-raised opacity-0 shadow-[0_1px_3px_oklch(0_0_0/0.3),0_4px_12px_oklch(0_0_0/0.18)]"
      style={{ width: SIZE, height: SIZE, transform: `translate(-50%, ${-SIZE - 4}px) scale(0.6)` }}
    >
      <svg ref={spinnerRef} viewBox="0 0 24 24" className="size-6 text-accent">
        <circle
          ref={arcRef}
          cx="12"
          cy="12"
          r="8.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ strokeDasharray: `0 ${CIRCUMFERENCE}`, transition: "opacity 150ms" }}
        />
      </svg>
    </div>
  );
}
