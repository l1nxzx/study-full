import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { MoreMenuItem } from "./MoreMenu";

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

/**
 * A menu opened by right-click on a computer or a long press on a phone, at the pointer. For
 * actions that shouldn't sit on screen as buttons (easy to hit by accident). Spread `handlers`
 * on the element and render `menu` next to it. A long press never also counts as a tap.
 */
export function usePressMenu(items: (MoreMenuItem | false | null | undefined)[]) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function cancel() {
    window.clearTimeout(timer.current);
    start.current = null;
  }

  const handlers = {
    onContextMenu(e: MouseEvent) {
      e.preventDefault();
      setAt({ x: e.clientX, y: e.clientY });
    },
    onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t || e.touches.length > 1) return cancel();
      fired.current = false;
      start.current = { x: t.clientX, y: t.clientY };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (!start.current) return;
        fired.current = true;
        setAt(start.current);
        navigator.vibrate?.(8);
      }, LONG_PRESS_MS);
    },
    onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (start.current && t && Math.hypot(t.clientX - start.current.x, t.clientY - start.current.y) > MOVE_TOLERANCE) cancel();
    },
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    // The tap that ends a long press must not also follow a link or press a button.
    onClickCapture(e: MouseEvent) {
      if (fired.current) {
        e.preventDefault();
        e.stopPropagation();
        fired.current = false;
      }
    },
  };

  const actions = items.filter(Boolean) as MoreMenuItem[];
  const plain = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  const menu = at ? (
    <DropdownMenu open onOpenChange={(open) => !open && setAt(null)}>
      <DropdownMenuTrigger asChild>
        <span aria-hidden className="pointer-events-none fixed size-px" style={{ left: at.x, top: at.y }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {plain.map((a) => (
          <DropdownMenuItem key={a.label} onSelect={a.onSelect} disabled={a.disabled}>
            {a.icon}
            {a.label}
          </DropdownMenuItem>
        ))}
        {plain.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((a) => (
          <DropdownMenuItem key={a.label} variant="destructive" onSelect={a.onSelect} disabled={a.disabled}>
            {a.icon}
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  return { handlers, menu };
}
