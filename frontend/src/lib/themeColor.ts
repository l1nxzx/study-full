// The phone's status and navigation bars follow <meta name="theme-color">. A web app can't make
// them transparent, so the colour follows whatever is actually at the top of the screen: the
// page, the notebook's desk, the open sidebar, or the dimmed backdrop behind a sheet. It is
// re-read whenever the page changes, so nothing has to set it by hand.

let ctx: CanvasRenderingContext2D | null = null;

/** The colour you see at a point: every background from the page down to the element there, blended. */
function colorAt(x: number, y: number): string | null {
  const hit = document.elementFromPoint(x, y);
  if (!hit) return null;

  const layers: string[] = [];
  for (let el: Element | null = hit; el; el = el.parentElement) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") layers.push(bg);
  }
  if (!layers.length) return null;

  if (!ctx) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
  }
  ctx.clearRect(0, 0, 1, 1);
  for (const color of layers.reverse()) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
  }
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

let frame = 0;

/** Re-reads the colour at the top of the screen on the next frame. */
export function syncThemeColor() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const color = colorAt(window.innerWidth / 2, 0);
    if (meta && color && meta.content !== color) meta.content = color;
  });
}

/** Keeps the bars in step with the page from now on. */
export function watchThemeColor() {
  new MutationObserver(syncThemeColor).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    // "style" too: dialogs switch pointer-events inline, and the hit test depends on them.
    attributeFilter: ["class", "style", "data-state", "open"],
  });
  window.addEventListener("resize", syncThemeColor);
  // Sheets and the sidebar slide in; read again once they have arrived.
  document.addEventListener("animationend", syncThemeColor);
  document.addEventListener("transitionend", syncThemeColor);
  syncThemeColor();
}
