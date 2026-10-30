import { useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { isRefreshPaused } from "@/hooks/usePauseRefresh";
import { applyWaitingUpdate, checkForUpdate } from "@/lib/serviceWorker";
import { cn } from "@/lib/utils";

const TRIGGER = 64;
const MAX = 110;

/**
 * Pull down at the top of a page to refresh, as in a native app: reloads the page's data and
 * picks up a new version of the app if one is ready. Touch screens only; the browser's own pull
 * to refresh is off because the page itself never scrolls.
 */
export function PullToRefresh({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) {
  const queryClient = useQueryClient();
  const indicatorRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !window.matchMedia("(pointer: coarse)").matches) return;

    let startX = 0;
    let startY = 0;
    let pull = 0;
    let tracking = false;

    function show(distance: number, animate: boolean) {
      const el = indicatorRef.current;
      if (!el) return;
      el.style.transition = animate ? "transform 200ms ease-out, opacity 200ms ease-out" : "none";
      el.style.transform = `translate(-50%, ${distance - 44}px)`;
      el.style.opacity = String(Math.min(1, distance / TRIGGER));
      if (iconRef.current && !refreshingRef.current) iconRef.current.style.transform = `rotate(${distance * 3}deg)`;
    }

    function onStart(e: TouchEvent) {
      const target = e.target as Element;
      tracking =
        !refreshingRef.current &&
        !isRefreshPaused() &&
        e.touches.length === 1 &&
        scroller!.scrollTop <= 0 &&
        !target.closest("input, textarea, select, [contenteditable='true']");
      if (!tracking) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pull = 0;
    }

    function onMove(e: TouchEvent) {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      // A sideways swipe or an upward scroll isn't a pull.
      if (pull === 0) {
        if (dy === 0) return;
        if (dy < 0 || Math.abs(dx) > dy) {
          tracking = false;
          return;
        }
      }
      if (scroller!.scrollTop > 0) {
        tracking = false;
        show(0, true);
        return;
      }
      // Resistance, so it feels attached to the finger but heavier the further it goes.
      pull = Math.min(MAX, dy * 0.5);
      show(pull, false);
    }

    async function onEnd() {
      if (!tracking) return;
      tracking = false;
      if (pull < TRIGGER) {
        show(0, true);
        return;
      }
      refreshingRef.current = true;
      setRefreshing(true);
      show(TRIGGER, true);
      navigator.vibrate?.(8);
      await Promise.allSettled([
        queryClient.refetchQueries({ type: "active" }),
        checkForUpdate(),
        // Keep the spinner up long enough to read as "done".
        new Promise((r) => setTimeout(r, 500)),
      ]);
      if (applyWaitingUpdate()) return;
      refreshingRef.current = false;
      setRefreshing(false);
      show(0, true);
    }

    scroller.addEventListener("touchstart", onStart, { passive: true });
    scroller.addEventListener("touchmove", onMove, { passive: true });
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
      ref={indicatorRef}
      aria-hidden={!refreshing}
      role="status"
      aria-label={refreshing ? "Refreshing" : undefined}
      className="pointer-events-none absolute left-1/2 top-0 z-30 flex size-9 items-center justify-center rounded-full border border-rule bg-raised text-accent opacity-0 shadow-md lg:hidden"
      style={{ transform: "translate(-50%, -44px)" }}
    >
      <RotateCw ref={iconRef} className={cn("size-4", refreshing && "animate-spin")} strokeWidth={2.25} />
    </div>
  );
}
