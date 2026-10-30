import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Moon, Sun, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import { Segmented } from "@/components/ui/segmented";
import { useNote } from "@/hooks/useNotes";
import { usePreferences } from "@/hooks/usePreferences";
import { useSubject } from "@/hooks/useSubjects";
import { formatDateLong } from "@/lib/date";
import { useCloseOnBack } from "@/lib/closeOnBack";
import { cn } from "@/lib/utils";

/*
 * Reading a note as a paper notebook.
 *
 * Pagination is done by the browser: the note is laid out in CSS columns with a fixed column
 * height, and each column is one page (the technique e-book readers use), so paragraphs,
 * lists and tables split across pages line by line. Paper sheets with ruled lines are drawn
 * behind the columns at the same positions: a rule between every two rows of text, so each
 * line of text sits inside its row, as in a school notebook. Each top-level block is snapped
 * to a whole number of rows so text keeps to the ruling. Pages alternate like the two sides
 * of an open notebook: the margin line is on the left of odd pages and the right of even ones.
 *
 * Wide screens show a two-page spread; narrow ones a single page. Pages turn with swipes
 * (the page follows your finger), the arrow keys, the mouse wheel or trackpad, the side
 * buttons, edge taps on phones, or the page slider. The position is remembered per note.
 * Full screen shows only the paper.
 */

const SWIPE_HINT_TIP = "notebook-swipe-hint";
// Rows are tall enough (about 1.9 times the text) for letters, accents and descenders to sit
// inside a row with air above and below, as in a school notebook.
const TEXT_SIZES = { small: { font: 15.5, line: 29 }, medium: { font: 17, line: 32 }, large: { font: 19, line: 36 } } as const;
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
  /** Distance of the margin line from the page's edge. */
  marginInset: number;
  contentH: number;
  colW: number;
  line: number;
  font: number;
}

function computeLayout(availW: number, availH: number, size: TextSize, fullscreen: boolean): Layout {
  const { font, line } = TEXT_SIZES[size];
  const phone = availW < 640;
  // Short screens (a phone on its side): spend the height on text, not margins.
  const short = availH < 520;
  const sideRoom = phone || (fullscreen && short) ? 0 : short ? 96 : 112; // space for the turn buttons
  const vPad = fullscreen && (phone || short) ? 0 : phone || short ? 6 : 24;
  const pageHMax = Math.max(320, availH - vPad * 2);

  // A real notebook page is a little taller than wide (A5-ish). Use a spread when two such
  // pages of a comfortable width fit.
  const idealW = Math.min(pageHMax * 0.74, fullscreen ? 720 : 560);
  const spread = !phone && !short && (availW - sideRoom) >= idealW * 2 && idealW >= 380;
  const perView = spread ? 2 : 1;
  const pageW = spread
    ? Math.floor(idealW)
    : phone
      ? Math.floor(fullscreen ? availW : availW - 20)
      : short
        ? Math.floor(Math.min(availW - sideRoom, 720))
      : Math.floor(Math.min(availW - sideRoom, Math.max(idealW, Math.min(620, availW - sideRoom))));
  const pageH = phone || short ? Math.floor(availH - vPad * 2) : Math.floor(Math.min(pageHMax, pageW / 0.7));

  const padTop = Math.round(line * (short ? 0.8 : phone ? 1.6 : 2.2));
  const minBottom = Math.round(line * (short ? 0.9 : 1.4));
  const contentH = Math.max(line * 4, Math.floor((pageH - padTop - minBottom) / line) * line);
  const padBottom = pageH - padTop - contentH;
  // The same space on both sides, since the margin line swaps sides from page to page.
  const padLeft = phone ? 30 : 56;
  const padRight = padLeft;
  const marginInset = phone ? 15 : 36;
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
    marginInset,
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
  const { data: subject } = useSubject(note?.subjectId ?? undefined);
  const { preferences, updatePreferences, isTipDismissed, dismissTip } = usePreferences();

  const paper = preferences.notebookPaper ?? "light";
  const textSize: TextSize = preferences.notebookTextSize ?? "medium";

  const areaRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);
  const [measured, setMeasured] = useState(false);
  // How far the rules move down so the letters sit in the middle of their rows (fonts put
  // their letters a little above or below the middle of a line).
  const [inkShift, setInkShift] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const pageRef = useRef(page);
  pageRef.current = page;

  const layout = useMemo(() => (area ? computeLayout(area.w, area.h, textSize, fullscreen) : null), [area, textSize, fullscreen]);
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
  }, [note, fullscreen]);

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

    // Where the letters of a line of text sit within it: centre them between two rules.
    const para = flow.querySelector<HTMLElement>(".study-prose p");
    const textNode = para && Array.from(para.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    if (para && textNode) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const glyphs = range.getClientRects()[0];
      if (glyphs) {
        const lineTop = para.getBoundingClientRect().top;
        const above = glyphs.top - lineTop;
        const below = L - (glyphs.bottom - lineTop);
        setInkShift(Math.round((above - below) * 2) / 4);
      }
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
  // The pages are hidden for the frame or two this takes, then fade back in at the same place,
  // so a new text size or a rotation never shows text jumping between pages.
  useLayoutEffect(() => {
    if (!layout || !note) return;
    if (anchorRef.current === null) anchorRef.current = readPosition(note.id)?.anchor ?? 0;
    setMeasured(false);
    const raf = requestAnimationFrame(() => relayout());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, note?.id, note?.contentMarkdown]);

  const relayoutRef = useRef(relayout);
  relayoutRef.current = relayout;
  useEffect(() => {
    if (!note?.id) return;
    let cancelled = false;
    const again = () => {
      if (!cancelled) relayoutRef.current();
    };
    document.fonts?.ready.then(again);
    const t = setTimeout(again, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [note?.id]);

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

  // Full screen: only the paper. Uses the browser's full screen where there is one (not on
  // iPhones), and always hides the bars; Esc, Back or the corner button leave it.
  const fullscreenRef = useRef(fullscreen);
  fullscreenRef.current = fullscreen;
  useEffect(() => {
    const el = document.documentElement;
    if (fullscreen) {
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => undefined);
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }, [fullscreen]);
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, []);
  useCloseOnBack(fullscreen, () => setFullscreen(false));

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
        if (fullscreenRef.current) setFullscreen(false);
        else close();
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

  // The page track is moved by writing its transform directly: following a finger must not
  // re-render the page (and the whole note in it) sixty times a second.
  const placeTrack = useCallback(
    (dx: number, animate: boolean) => {
      const track = trackRef.current;
      if (!track) return;
      track.style.transition = animate && !reduceMotionRef.current ? "transform 300ms cubic-bezier(0.22, 0.7, 0.2, 1)" : "none";
      track.style.transform = `translate3d(${-pageRef.current * stride + dx}px, 0, 0)`;
    },
    [stride]
  );
  const reduceMotionRef = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // Turning a page animates; a new layout (size, rotation) jumps straight to the place.
  const shown = useRef({ stride, measured });
  useLayoutEffect(() => {
    const steady = shown.current.stride === stride && shown.current.measured && measured;
    shown.current = { stride, measured };
    placeTrack(0, steady);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, stride, measured]);

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
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // The pointer is already gone; the drag still works without capture.
        }
      }
    }
    if (t.horizontal) {
      const atStart = pageRef.current === 0 && dx > 0;
      const atEnd = pageRef.current >= lastStart && dx < 0;
      placeTrack(atStart || atEnd ? dx * 0.3 : dx, false);
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
      let turned = false;
      if (dx < -60 || (fast && dx < 0)) {
        turned = pageRef.current < lastStart;
        next();
      } else if (dx > 60 || (fast && dx > 0)) {
        turned = pageRef.current > 0;
        prev();
      }
      // No page turn (too short a swipe, or at either end): spring back.
      if (!turned) placeTrack(0, true);
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
    placeTrack(0, true);
  }

  // First visit on a narrow screen: say how to turn pages, once.
  useEffect(() => {
    if (measured && layout && !layout.spread && pageCount > 1 && !isTipDismissed(SWIPE_HINT_TIP)) setShowHint(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measured, layout?.spread, pageCount]);

  // The note itself is the expensive part to render (Markdown, maths). It only changes with the
  // note or the text size, never while turning pages or switching the paper.
  const font = layout?.font;
  const line = layout?.line;
  const content = useMemo(
    () =>
      note && font && line ? (
        <>
          <div className="notebook-head">
            <h1 className="font-serif font-semibold text-[var(--fg)]" style={{ fontSize: font * 1.12, lineHeight: `${line}px` }}>
              {note.title}
            </h1>
            <p className="font-sans text-[var(--fg-muted)]" style={{ fontSize: Math.round(font * 0.78), lineHeight: `${line}px` }}>
              {subject ? `${subject.name} · ` : ""}
              {formatDateLong(note.date)}
            </p>
          </div>
          <MarkdownRenderer content={note.contentMarkdown} />
          <div data-nb-end style={{ height: 0 }} />
        </>
      ) : null,
    [note, subject, font, line]
  );

  if (isError) return <Navigate to="/notes" replace />;

  const sheets = layout ? Math.max(pageCount, Math.ceil(pageCount / perView) * perView) : 0;
  const viewW = layout ? perView * layout.pageW + (perView - 1) * layout.gap : 0;
  const pageLabel =
    perView === 2 && page + 1 < pageCount ? `Pages ${page + 1}–${page + 2} of ${pageCount}` : `Page ${page + 1} of ${pageCount}`;
  const edgeToEdge = fullscreen && layout && !layout.spread && area !== null && area.w < 640;

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
      {!fullscreen && (
        <header className="flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)] sm:h-[calc(3.5rem+env(safe-area-inset-top))] sm:gap-2 sm:px-4">
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
          <button type="button" onClick={() => setFullscreen(true)} className={cn(turnButton, "size-10")} aria-label="Full screen" title="Full screen">
            <Maximize2 className="size-[1.125rem]" />
          </button>
        </header>
      )}

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
              style={{ width: viewW, height: layout.pageH, opacity: measured ? 1 : 0, transition: measured ? "opacity 160ms" : "none" }}
              aria-roledescription="notebook"
              aria-label={`${note.title}, ${pageLabel}`}
            >
              <div ref={trackRef} className="absolute left-0 top-0 h-full will-change-transform" style={{ width: sheets * stride }}>
                {Array.from({ length: sheets }, (_, i) => {
                  const isLeft = perView === 2 && i % 2 === 0;
                  const isRight = perView === 2 && i % 2 === 1;
                  // Like the two sides of an open notebook: every second page is mirrored.
                  const mirrored = i % 2 === 1;
                  return (
                    <div
                      key={i}
                      aria-hidden
                      className="absolute top-0 bg-[var(--nb-paper)] [contain:strict]"
                      style={{
                        left: i * stride,
                        width: layout.pageW,
                        height: layout.pageH,
                        borderRadius: edgeToEdge ? 0 : perView === 2 ? (isLeft ? "6px 0 0 6px" : "0 6px 6px 0") : 6,
                        boxShadow: edgeToEdge ? "none" : "0 1px 2px rgb(0 0 0 / 0.12), 0 8px 24px -12px rgb(0 0 0 / 0.25)",
                      }}
                    >
                      {/* Ruled lines between the rows of text, including above the first one. */}
                      <div
                        className="absolute inset-x-0"
                        style={{
                          top: layout.padTop + inkShift,
                          height: layout.contentH + 1,
                          backgroundImage: `repeating-linear-gradient(to bottom, var(--nb-rule) 0, var(--nb-rule) 1px, transparent 1px, transparent ${layout.line}px)`,
                        }}
                      />
                      {/* Margin line, on the outer side of each page. */}
                      <div
                        className="absolute inset-y-0 w-px bg-[var(--nb-margin)]"
                        style={mirrored ? { right: layout.marginInset } : { left: layout.marginInset }}
                      />
                      {/* Spine shadow on a spread. */}
                      {isLeft && <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--nb-spine)] to-transparent" />}
                      {isRight && <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--nb-spine)] to-transparent" />}
                      {i < pageCount && (
                        <span
                          className="absolute font-sans text-[0.6875rem] text-[var(--fg-faint)] tabular"
                          style={{ bottom: Math.max(8, layout.padBottom / 2 - 8), ...(mirrored ? { right: 24 } : { left: 24 }) }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </div>
                  );
                })}

                <div ref={flowRef} className="notebook-flow" style={flowStyle}>
                  {content}
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

          {fullscreen && (
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top))] z-20 flex size-9 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--nb-desk)_70%,transparent)] text-[var(--nb-desk-fg-faint)] backdrop-blur-sm transition-colors hover:text-[var(--nb-desk-fg)]"
              aria-label="Leave full screen"
              title="Leave full screen (Esc)"
            >
              <Minimize2 className="size-4" />
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

      {!fullscreen && (
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
      )}
    </div>
  );
}
