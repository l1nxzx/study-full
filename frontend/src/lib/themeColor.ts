import { useLayoutEffect, type RefObject } from "react";

// The phone's status and navigation bars follow <meta name="theme-color">, one colour for both.
// They stay the page background, which is also the bottom nav's, so the system bar at the
// bottom always continues it; sheets and the sidebar don't change them. Only a full-screen view
// with no bottom nav (the notebook's desk) adds a layer, set in the same commit as it mounts.

/** CSS colours, or custom property names ("--color-panel") read from `scope` or the page. */
type Layers = string[] | (() => string[]);
interface Entry {
  layers: Layers;
  scope?: RefObject<Element | null>;
}

const stack: Entry[] = [];
let ctx: CanvasRenderingContext2D | null = null;

function resolve(value: string, scope: Element) {
  return value.startsWith("--") ? getComputedStyle(scope).getPropertyValue(value).trim() : value;
}

/** Sets the bars from the open layers, or the page background when nothing covers the top. */
export function syncThemeColor() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  if (!ctx) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
  }
  const root = document.documentElement;
  ctx.clearRect(0, 0, 1, 1);
  const paint = (color: string) => {
    if (!color) return;
    ctx!.fillStyle = color;
    ctx!.fillRect(0, 0, 1, 1);
  };
  paint(resolve("--color-canvas", root));
  for (const { layers, scope } of stack) {
    const el = scope?.current ?? root;
    for (const layer of typeof layers === "function" ? layers() : layers) paint(resolve(layer, el));
  }
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  if (meta.content !== hex) meta.content = hex;
}

/**
 * Adds a layer to the bars while `active`. `key` re-reads it when what it resolves to changes
 * (the notebook's paper, say).
 */
export function useBarColor(active: boolean, layers: Layers, options: { scope?: RefObject<Element | null>; key?: unknown } = {}) {
  const { scope, key } = options;
  const id = typeof layers === "function" ? "fn" : layers.join("|");
  useLayoutEffect(() => {
    if (!active) return;
    const entry: Entry = { layers, scope };
    stack.push(entry);
    syncThemeColor();
    return () => {
      stack.splice(stack.indexOf(entry), 1);
      syncThemeColor();
    };
    // `layers` is compared by `id`; a new array each render shouldn't re-add the layer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, id, scope, key]);
}
