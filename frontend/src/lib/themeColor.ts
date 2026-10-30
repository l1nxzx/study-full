import { useLayoutEffect, type RefObject } from "react";

// The phone's status and navigation bars follow <meta name="theme-color">. A web app can't make
// them transparent, so they take the colour of whatever is at the top of the screen. Anything
// that covers the top while open (the sidebar, a sheet's dimmed backdrop, the assistant, the
// notebook) adds a layer here as it mounts, in the same commit, so the bars change in the same
// frame as the screen. Layers stack in the order they opened; translucent ones (a backdrop)
// blend over what is beneath.

/** The dimmed backdrop behind sheets and the sidebar. Keep in sync with their bg-[...] classes. */
export const SCRIM = "oklch(0.14 0.01 265 / 0.55)";

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

/** A layer that lasts as long as it is mounted, for content that only mounts while open. */
export function BarColor({ layers }: { layers: Layers }) {
  useBarColor(true, layers);
  return null;
}
