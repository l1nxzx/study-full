// The phone's status and navigation bars follow <meta name="theme-color">. Keep it on the colour
// actually behind the page: the canvas of the current theme, or a page's own background (the
// notebook's desk) while that page is open.

function toHex(cssColor: string): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Sets the bars to a colour; without one, to the theme's page background. */
export function setThemeColor(cssColor?: string) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  const color = cssColor ?? getComputedStyle(document.documentElement).getPropertyValue("--color-canvas").trim();
  const hex = color ? toHex(color) : null;
  if (hex) meta.content = hex;
}
