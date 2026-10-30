import { ChevronLeft, ChevronRight, Moon, Sun, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import { Segmented } from "@/components/ui/segmented";
import { useNote } from "@/hooks/useNotes";
import { usePreferences } from "@/hooks/usePreferences";
import { useSubject } from "@/hooks/useSubjects";
import { formatDateLong } from "@/lib/date";
import { cn } from "@/lib/utils";

/*
 * Reading a note as a paper notebook.
 *
 * Pagination is done by the browser: the note is laid out in CSS columns with a fixed column
 * height, and each column is one page (the technique e-book readers use), so paragraphs,
 * lists and tables split across pages line by line. Paper sheets with ruled lines are drawn
 * behind the columns at the same positions. Each top-level block is snapped to a whole
 * number of lines so text keeps sitting on the ruling.
 *
 * Wide screens show a two-page spread; narrow ones a single page. Pages turn with swipes
 * (the page follows your finger), the arrow keys, the mouse wheel or trackpad, the side
 * buttons, edge taps on phones, or the page slider. The position is remembered per note.
 */

const SWIPE_HINT_TIP = "notebook-swipe-hint";
const TEXT_SIZES = { small: { font: 15.5, line: 27 }, medium: { font: 17, line: 30 }, large: { font: 19, line: 33 } } as const;
type TextSize = keyof typeof TEXT_SIZES;

interface Layout {
  spread: boolean;
  perView: 1 | 2;
  pageW: number;
  pageH: number;
  gap: number;
  padTop: number;
  padBottom: number;
  padLeft: number;
  padRight: number;
  contentH: number;
  colW: number;
  line: number;
  font: number;
}

function computeLayout(availW: number, availH: number, size: TextSize): Layout {
  const { font, line } = TEXT_SIZES[size];
  const phone = availW < 640;
  // Short screens (a phone on its side): spend the height on text, not margins.
  const short = availH < 520;
  const sideRoom = phone ? 0 : short ? 96 : 112; // space for the turn buttons
  const vPad = phone || short ? 6 : 24;
  const pageHMax = Math.max(320, availH - vPad * 2);

  // A real notebook page is a little taller than wide (A5-ish). Use a spread when two such
  // pages of a comfortable width fit.
  const idealW = Math.min(pageHMax * 0.74, 560);
  const spread = !phone && !short && (availW - sideRoom) >= idealW * 2 && idealW >= 380;
  const perView = spread ? 2 : 1;
  const pageW = spread
    ? Math.floor(idealW)
    : phone
      ? Math.floor(availW - 20)
      : short
        ? Math.floor(Math.min(availW - sideRoom, 720))
      : Math.floor(Math.min(availW - sideRoom, Math.max(idealW, Math.min(620, availW - sideRoom))));
  const pageH = phone || short ? Math.floor(availH - vPad * 2) : Math.floor(Math.min(pageHMax, pageW / 0.7));

  const padTop = Math.round(line * (short ? 0.8 : phone ? 1.6 : 2.2));
  const minBottom = Math.round(line * (short ? 0.9 : 1.4));
  const contentH = Math.max(line * 4, Math.floor((pageH - padTop - minBottom) / line) * line);
  const padBottom = pageH - padTop - contentH;
  const padLeft = phone ? 38 : 64;
  const padRight = phone ? 18 : 34;
  return {
    spread,
    perView,
    pageW,
    pageH,
    gap: spread ? 0 : 24,
    padTop,
    padBottom,
    padLeft,
    padRight,
    contentH,
    colW: pageW - padLeft - padRight,
    line,
    font,
  };
}

const positionKey = (noteId: string) => `study.notebook.${noteId}`;

function readPosition(noteId: string): { anchor: number; page: number } | null {
  try {
    return JSON.parse(localStorage.getItem(positionKey(noteId)) || "null");
  } catch {
    return null;
  }
}

function writePosition(noteId: string, anchor: number, page: number) {
  try {
    localStorage.setItem(positionKey(noteId), JSON.stringify({ anchor, page }));
  } catch {
    // ignore
  }
}

export function NotebookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: note, isLoading, isError } = useNote(id);
  const { data: subject } = useSubject(note?.subjectId);
  const { preferences, updatePreferences, isTipDismissed, dismissTip } = usePreferences();

  const paper = preferences.notebookPaper ?? "light";
  const textSize: TextSize = preferences.notebookTextSize ?? "medium";

  const areaRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);
  const [baseline, setBaseline] = useState(0);
  const [measured, setMeasured] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const pageRef = useRef(page);
  pageRef.current = page;

  const layout = useMemo(() => (area ? computeLayout(area.w, area.h, textSize) : null), [area, textSize]);
  const stride = layout ? layout.pageW + layout.gap : 0;
  const perView = layout?.perView ?? 1;
  const lastStart = Math.max(0, Math.floor((pageCount - 1) / perView) * perView);

  // Track the reading area's size.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () => setArea({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [note]);

  // Which top-level block starts the given page - used to keep your place when the layout
  // changes (rotation, resize, text size) and to remember it between visits.
  const anchorForPage = useCallback(
    (p: number): number => {
      const flow = flowRef.current;
      if (!flow || !stride) return 0;
      const origin = flow.getBoundingClientRect().left;
      const blocks = flow.querySelectorAll<HTMLElement>("[data-nb-block]");
      // The block that is being read at the top of the page: the last one starting on or
      // before it (a long paragraph may start a page or two earlier).
      let anchor = 0;
      for (let i = 0; i < blocks.length; i++) {
        const rect = blocks[i].getClientRects()[0];
        if (!rect) continue;
        const col = Math.floor((rect.left - origin + 2) / stride);
        if (col > p) break;
        anchor = i;
      }
      return anchor;
    },
    [stride]
  );

  const pageOfAnchor = useCallback(
    (anchor: number): number => {
      const flow = flowRef.current;
      if (!flow || !stride) return 0;
      const block = flow.querySelectorAll<HTMLElement>("[data-nb-block]")[anchor];
      const rect = block?.getClientRects()[0];
      if (!rect) return 0;
      return Math.max(0, Math.floor((rect.left - flow.getBoundingClientRect().left + 2) / stride));
    },
    [stride]
  );

  // The block at the top of the current page. Kept up to date as you turn pages (measured
  // against the geometry that was on screen at the time), so a relayout can return to it.
  const anchorRef = useRef<number | null>(null);
  const measuredRef = useRef(false);

  // Lay out: snap blocks to the ruling, find where the baseline sits, count pages, restore
  // the reading position. Runs whenever the geometry, the text size or the note changes, and
  // again once web fonts and math fonts have finished loading.
  const relayout = useCallback(() => {
    const flow = flowRef.current;
    if (!flow || !layout) return;
    const L = layout.line;

    const prose = flow.querySelector<HTMLElement>(".study-prose");
    const blocks: HTMLElement[] = [];
    const head = flow.querySelector<HTMLElement>(".notebook-head");
    if (head) blocks.push(...(Array.from(head.children) as HTMLElement[]));
    if (prose) blocks.push(...(Array.from(prose.children) as HTMLElement[]));
    blocks.forEach((b, i) => {
      b.setAttribute("data-nb-block", String(i));
      b.style.marginBottom = "";
    });

    // Snap every block (except the last) to a whole number of lines, plus one empty line -
    // headings get no empty line after them. Blocks broken across pages are already made of
    // whole lines and are left alone.
    blocks.forEach((b, i) => {
      if (i === blocks.length - 1) return;
      const rects = b.getClientRects();
      if (rects.length !== 1) return;
      const h = rects[0].height;
      const isHeading = /^H[1-6]$/.test(b.tagName);
      const lines = Math.max(1, Math.ceil((h - 1) / L));
      const after = isHeading ? 0 : L;
      b.style.marginBottom = `${lines * L - h + after}px`;
    });

    // Where the text baseline sits inside a line, so the ruling goes right under the letters.
    const probe = probeRef.current?.querySelector<HTMLElement>("[data-nb-probe]");
    if (probe) {
      const lineBox = probe.parentElement!.getBoundingClientRect();
      setBaseline(probe.getBoundingClientRect().top - lineBox.top);
    }

    const end = flow.querySelector<HTMLElement>("[data-nb-end]");
    const flowLeft = flow.getBoundingClientRect().left;
    const endLeft = end ? end.getBoundingClientRect().left : flowLeft;
    const count = Math.max(1, Math.floor((endLeft - flowLeft + 2) / stride) + 1);
    setPageCount(count);

    const anchor = anchorRef.current;
    if (anchor !== null) {
      const target = pageOfAnchor(anchor);
      const aligned = Math.floor(target / layout.perView) * layout.perView;
      setPage(Math.min(aligned, Math.max(0, Math.floor((count - 1) / layout.perView) * layout.perView)));
    }
    measuredRef.current = true;
    setMeasured(true);
  }, [layout, stride, pageOfAnchor]);

  // Re-measure whenever the geometry, text size or note changes (after the new column
  // geometry has been applied), and again once web fonts and math fonts have loaded.
  useLayoutEffect(() => {
    if (!layout || !note) return;
    if (anchorRef.current === null) anchorRef.current = readPosition(note.id)?.anchor ?? 0;
    const raf = requestAnimationFrame(() => relayout());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, note?.id, note?.contentMarkdown]);

  useEffect(() => {
    if (!note) return;
    let cancelled = false;
    const again = () => {
      if (!cancelled) relayout();
    };
    document.fonts?.ready.then(again);
    const t1 = setTimeout(again, 400);
    const t2 = setTimeout(again, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [note, relayout]);

  // Follow the page: update the anchor (for relayouts) and remember it for the next visit.
  useEffect(() => {
    if (!note || !measuredRef.current) return;
    const anchor = anchorForPage(page);
    anchorRef.current = anchor;
    const t = setTimeout(() => writePosition(note.id, anchor, page), 300);
    return () => clearTimeout(t);
    // Deliberately not re-run when the geometry changes: then the anchor must survive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, page]);

  const goTo = useCallback(
    (p: number) => {
      const clamped = Math.min(Math.max(0, Math.floor(p / perView) * perView), lastStart);
      setPage(clamped);
    },
    [perView, lastStart]
  );
  const next = useCallback(() => goTo(pageRef.current + perView), [goTo, perView]);
  const prev = useCallback(() => goTo(pageRef.current - perView), [goTo, perView]);

  const close = useCallback(() => navigate(id ? `/notes/${id}` : "/notes"), [navigate, id]);

  // Keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [role=radiogroup]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        goTo(0);
      } else if (e.key === "End") {
        goTo(lastStart);
      } else if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goTo, lastStart, close]);

  // Mouse wheel and trackpad: one notch / one swipe turns one page (spread).
  const wheel = useRef({ acc: 0, lockedUntil: 0 });
  function onWheel(e: React.WheelEvent) {
    if ((e.target as HTMLElement).closest("pre, table, .katex-display")) {
      // Let wide blocks scroll sideways.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    }
    const now = Date.now();
    if (now < wheel.current.lockedUntil) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    wheel.current.acc += delta;
    if (Math.abs(wheel.current.acc) > 60) {
      if (wheel.current.acc > 0) next();
      else prev();
      wheel.current = { acc: 0, lockedUntil: now + 420 };
    }
  }

  // Touch: the pages follow your finger; let go past a threshold (or flick) to turn.
  const touch = useRef<{ x: number; y: number; t: number; id: number; horizontal: boolean | null } | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return;
    touch.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, horizontal: null };
  }
  function onPointerMove(e: React.PointerEvent) {
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (t.horizontal === null && Math.hypot(dx, dy) > 8) {
      t.horizontal = Math.abs(dx) > Math.abs(dy);
      if (t.horizontal) {
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
    if (t.horizontal) {
      const atStart = pageRef.current === 0 && dx > 0;
      const atEnd = pageRef.current >= lastStart && dx < 0;
      setDragX(atStart || atEnd ? dx * 0.3 : dx);
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    const t = touch.current;
    touch.current = null;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.x;
    const dt = Math.max(1, Date.now() - t.t);
    if (t.horizontal) {
      const fast = Math.abs(dx) / dt > 0.3 && Math.abs(dx) > 30;
      if (dx < -60 || (fast && dx < 0)) next();
      else if (dx > 60 || (fast && dx > 0)) prev();
      setDragging(false);
      setDragX(0);
      if (showHint) {
        setShowHint(false);
        dismissTip(SWIPE_HINT_TIP);
      }
      return;
    }
    // A short tap near the left or right edge turns the page on phones (not on links or while selecting).
    if (t.horizontal === null && dt < 300 && layout && !layout.spread) {
      const el = e.target as HTMLElement;
      if (el.closest("a, button, input, textarea") || window.getSelection()?.toString()) return;
      const rect = areaRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.22) prev();
      else if (x > rect.width * 0.78) next();
    }
  }
  function onPointerCancel() {
    touch.current = null;
    setDragging(false);
    setDragX(0);
  }

  // First visit on a narrow screen: say how to turn pages, once.
  useEffect(() => {
    if (measured && layout && !layout.spread && pageCount > 1 && !isTipDismissed(SWIPE_HINT_TIP)) setShowHint(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measured, layout?.spread, pageCount]);

  if (isError) return <Navigate to="/notes" replace />;

  const sheets = layout ? Math.max(pageCount, Math.ceil(pageCount / perView) * perView) : 0;
  const viewW = layout ? perView * layout.pageW + (perView - 1) * layout.gap : 0;
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pageLabel =
    perView === 2 && page + 1 < pageCount ? `Pages ${page + 1}–${page + 2} of ${pageCount}` : `Page ${page + 1} of ${pageCount}`;

  const flowStyle = layout
    ? ({
        "--nb-line": `${layout.line}px`,
        "--nb-font": `${layout.font}px`,
        "--nb-content-height": `${layout.contentH}px`,
        position: "absolute",
        top: layout.padTop,
        left: layout.padLeft,
        width: layout.colW,
        height: layout.contentH,
        columnWidth: layout.colW,
        columnGap: stride - layout.colW,
        columnFill: "auto",
        fontSize: layout.font,
      } as CSSProperties)
    : undefined;

  const turnButton =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--nb-desk-fg-faint)] transition-colors hover:bg-[color-mix(in_oklch,var(--nb-desk-fg)_9%,transparent)] hover:text-[var(--nb-desk-fg)] disabled:pointer-events-none disabled:opacity-25";

  return (
    <div className={cn("flex h-dvh flex-col overflow-hidden bg-[var(--nb-desk)] text-[var(--nb-desk-fg)]", `notebook-paper-${paper}`)}>
      <header className="flex h-12 shrink-0 items-center gap-2 px-2 pt-[env(safe-area-inset-top)] sm:h-14 sm:px-4">
        <button type="button" onClick={close} className={cn(turnButton, "size-10")} aria-label="Close notebook view" title="Close (Esc)">
          <X className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{note?.title}</p>
        <div className="shrink-0">
          <Segmented
            label="Text size"
            size="sm"
            value={textSize}
            onChange={(v) => updatePreferences({ notebookTextSize: v })}
            options={[
              { value: "small", label: "A" },
              { value: "medium", label: <span className="text-[0.9375rem]">A</span> },
              { value: "large", label: <span className="text-[1.0625rem]">A</span> },
            ]}
            className="border-[color-mix(in_oklch,var(--nb-desk-fg)_25%,transparent)]"
          />
        </div>
        <button
          type="button"
          onClick={() => updatePreferences({ notebookPaper: paper === "light" ? "dark" : "light" })}
          className={cn(turnButton, "size-10")}
          aria-label={paper === "light" ? "Use dark paper" : "Use white paper"}
          title={paper === "light" ? "Dark paper" : "White paper"}
        >
          {paper === "light" ? <Moon className="size-[1.125rem]" /> : <Sun className="size-[1.125rem]" />}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div
          ref={areaRef}
          className="relative flex h-full w-full items-center justify-center overflow-hidden"
          style={{ touchAction: "pinch-zoom" }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {layout && area && area.w >= 640 && (
            <button type="button" onClick={prev} disabled={page === 0} className={cn(turnButton, "absolute left-2 top-1/2 z-10 -translate-y-1/2 lg:left-6")} aria-label="Previous page">
              <ChevronLeft className="size-6" />
            </button>
          )}

          {(isLoading || !note) && <p className="text-sm text-[var(--nb-desk-fg-faint)]">Opening the notebook...</p>}

          {note && layout && (
            <div
              className="relative overflow-hidden"
              style={{ width: viewW, height: layout.pageH, opacity: measured ? 1 : 0, transition: "opacity 150ms" }}
              aria-roledescription="notebook"
              aria-label={`${note.title}, ${pageLabel}`}
            >
              <div
                ref={trackRef}
                className="absolute left-0 top-0 h-full"
                style={{
                  transform: `translateX(${-page * stride + dragX}px)`,
                  transition: dragging || reduceMotion ? "none" : "transform 320ms cubic-bezier(0.22, 0.7, 0.2, 1)",
                  width: sheets * stride,
                }}
              >
                {Array.from({ length: sheets }, (_, i) => {
                  const isLeft = perView === 2 && i % 2 === 0;
                  const isRight = perView === 2 && i % 2 === 1;
                  return (
                    <div
                      key={i}
                      aria-hidden
                      className="absolute top-0 bg-[var(--nb-paper)]"
                      style={{
                        left: i * stride,
                        width: layout.pageW,
                        height: layout.pageH,
                        borderRadius: perView === 2 ? (isLeft ? "6px 0 0 6px" : "0 6px 6px 0") : 6,
                        boxShadow: "0 1px 2px rgb(0 0 0 / 0.12), 0 8px 24px -12px rgb(0 0 0 / 0.25)",
                      }}
                    >
                      {/* Ruled lines under the text baselines. */}
                      <div
                        className="absolute inset-x-0"
                        style={{
                          top: layout.padTop,
                          height: layout.contentH,
                          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${layout.line - 1}px, var(--nb-rule) ${layout.line - 1}px, var(--nb-rule) ${layout.line}px)`,
                          backgroundPosition: `0 ${Math.round(baseline + 3 - layout.line)}px`,
                        }}
                      />
                      {/* Margin line. */}
                      <div className="absolute inset-y-0 w-px bg-[var(--nb-margin)]" style={{ left: layout.padLeft - 14 }} />
                      {/* Spine shadow on a spread. */}
                      {isLeft && <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--nb-spine)] to-transparent" />}
                      {isRight && <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--nb-spine)] to-transparent" />}
                      {i < pageCount && (
                        <span
                          className={cn("absolute font-sans text-[0.6875rem] text-[var(--fg-faint)] tabular", isLeft ? "left-6" : "right-6")}
                          style={{ bottom: Math.max(8, layout.padBottom / 2 - 8) }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </div>
                  );
                })}

                <div ref={flowRef} className="notebook-flow" style={flowStyle}>
                  <div className="notebook-head">
                    <h1 className="font-serif font-semibold text-[var(--fg)]" style={{ fontSize: layout.font * 1.4, lineHeight: `${layout.line}px` }}>
                      {note.title}
                    </h1>
                    <p className="font-sans text-[var(--fg-muted)]" style={{ fontSize: Math.round(layout.font * 0.78), lineHeight: `${layout.line}px` }}>
                      {subject ? `${subject.name} · ` : ""}
                      {formatDateLong(note.date)}
                    </p>
                  </div>
                  <MarkdownRenderer content={note.contentMarkdown} />
                  <div data-nb-end style={{ height: 0 }} />
                </div>
              </div>
              {/* Invisible line used to find where the baseline sits within a ruled line. */}
              <div ref={probeRef} aria-hidden className="notebook-flow pointer-events-none invisible absolute left-0 top-0" style={flowStyle && { "--nb-line": flowStyle["--nb-line" as keyof CSSProperties], "--nb-font": flowStyle["--nb-font" as keyof CSSProperties] } as CSSProperties}>
                <div className="study-prose">
                  <p>
                    Xg
                    <span data-nb-probe className="inline-block h-0 w-0 align-baseline" />
                  </p>
                </div>
              </div>
            </div>
          )}

          {layout && area && area.w >= 640 && (
            <button
              type="button"
              onClick={next}
              disabled={page >= lastStart}
              className={cn(turnButton, "absolute right-2 top-1/2 z-10 -translate-y-1/2 lg:right-6")}
              aria-label="Next page"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {showHint && (
            <div className="pointer-events-auto absolute inset-x-0 bottom-4 z-20 flex justify-center px-6">
              <div className="flex items-center gap-3 rounded-full bg-[var(--fg)] py-2 pl-4 pr-2 text-[0.8125rem] text-[var(--nb-paper)] shadow-md">
                <span>Swipe left or right to turn the page</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowHint(false);
                    dismissTip(SWIPE_HINT_TIP);
                  }}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-white/10"
                  aria-label="Got it"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-3 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-3">
        <button type="button" onClick={prev} disabled={page === 0} className={cn(turnButton, "size-10 sm:hidden")} aria-label="Previous page">
          <ChevronLeft className="size-5" />
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, Math.ceil(pageCount / perView) - 1)}
          value={Math.floor(page / perView)}
          onChange={(e) => goTo(Number(e.target.value) * perView)}
          aria-label="Go to page"
          aria-valuetext={pageLabel}
          className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--accent)]"
          disabled={pageCount <= perView}
        />
        <p className="w-36 shrink-0 text-right text-meta text-[var(--nb-desk-fg-faint)] tabular" aria-live="polite">
          {pageLabel}
        </p>
        <button type="button" onClick={next} disabled={page >= lastStart} className={cn(turnButton, "size-10 sm:hidden")} aria-label="Next page">
          <ChevronRight className="size-5" />
        </button>
      </footer>
    </div>
  );
}
