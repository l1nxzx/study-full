// Shared regex + helpers for Study's custom inline tags: the <aialter original="...">
// and <aiadd> review markers the notes-to-Markdown prompt asks external AI tools to use,
// plus the <highlight color="..."> colored-highlight tag (see remarkAiMarkup.ts and
// CustomHighlight.tsx for the render-time half).
//
// These are parsed out of the raw markdown STRING (never as real HTML/rehype-raw), and
// - critically - the tag text itself never reaches the markdown parser: CommonMark
// treats anything shaped like <word ...> as raw inline HTML the moment it sees it, so
// by the time a remark plugin could look at "text" nodes the tags would already have
// been split into separate (and, without rehype-raw, inert/escaped) HTML nodes. To
// avoid that, prepareContentForRendering() replaces every tag with an inert sentinel
// *before* the string is ever handed to the markdown parser; remarkAiMarkup.ts then
// only ever has to find that sentinel inside plain text nodes.

export const AI_ALTER_PATTERN = /<aialter\s+original="([^"]*)"\s*>([\s\S]*?)<\/aialter>/gi;
export const AI_ADD_PATTERN = /<aiadd>([\s\S]*?)<\/aiadd>/gi;
export const HIGHLIGHT_TAG_PATTERN =
  /<highlight\s+color="(yellow|blue|green|red|purple|orange)"\s*>([\s\S]*?)<\/highlight>/gi;

function combinedPattern(): RegExp {
  return new RegExp(`${AI_ALTER_PATTERN.source}|${AI_ADD_PATTERN.source}|${HIGHLIGHT_TAG_PATTERN.source}`, "gi");
}

// Wrapped in a Private-Use-Area character (U+E000) on both sides: not valid CommonMark
// syntax, so it always survives markdown parsing as plain text, and the wrapper makes
// collisions with real note content (e.g. "Vitamin D3", "Room A0") effectively impossible.
const PUA = String.fromCharCode(0xe000);
const ALTER_SENTINEL = (i: number) => `${PUA}A${i}${PUA}`;
const ADD_SENTINEL = (i: number) => `${PUA}D${i}${PUA}`;
const HIGHLIGHT_SENTINEL = (i: number) => `${PUA}H${i}${PUA}`;
export const SENTINEL_PATTERN = new RegExp(`${PUA}([ADH])(\\d+)${PUA}`, "g");

// <notest>...</notest> marks text that stays in the note but is left out of everything that
// tests knowledge: quizzes, flashcards, tests (the backend removes it before the AI sees the
// note - see backend/src/utils/noteMarkup.ts). Marked in the formatting editor's toolbar.
export const NO_TEST_OPEN_TAG = "<notest>";
export const NO_TEST_CLOSE_TAG = "</notest>";
const NO_TEST_OPEN_PATTERN = /<notest>/gi;
const NO_TEST_CLOSE_PATTERN = /<\/notest>/gi;
// Each sentinel is a private-use character (which makes it unmistakable) between two rare
// punctuation marks: Markdown only opens or closes **bold** next to a tag when the tag looks
// like punctuation to it, e.g. in <notest>**"quoted"**</notest>.
export const NO_TEST_OPEN_SENTINEL = `\u2e1c${String.fromCharCode(0xe001)}\u2e1c`;
export const NO_TEST_CLOSE_SENTINEL = `\u2e1d${String.fromCharCode(0xe002)}\u2e1d`;
export const NO_TEST_SENTINEL_PATTERN = new RegExp(`${NO_TEST_OPEN_SENTINEL}|${NO_TEST_CLOSE_SENTINEL}`, "g");
export const NO_TEST_TITLE = "Not included in quizzes, flashcards or tests";

export interface AiAlteration {
  index: number;
  original: string;
  corrected: string;
}

export interface AiAddition {
  index: number;
  text: string;
}

export type HighlightColor = "yellow" | "blue" | "green" | "red" | "purple" | "orange";

export interface AiHighlight {
  index: number;
  color: HighlightColor;
  text: string;
}

export function findAlterations(markdown: string): AiAlteration[] {
  const results: AiAlteration[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(AI_ALTER_PATTERN.source, "gi");
  let i = 0;
  while ((match = re.exec(markdown))) {
    results.push({ index: i++, original: match[1], corrected: match[2] });
  }
  return results;
}

export function findAdditions(markdown: string): AiAddition[] {
  const results: AiAddition[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(AI_ADD_PATTERN.source, "gi");
  let i = 0;
  while ((match = re.exec(markdown))) {
    results.push({ index: i++, text: match[1] });
  }
  return results;
}

export function findHighlights(markdown: string): AiHighlight[] {
  const results: AiHighlight[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(HIGHLIGHT_TAG_PATTERN.source, "gi");
  let i = 0;
  while ((match = re.exec(markdown))) {
    results.push({ index: i++, color: match[1] as HighlightColor, text: match[2] });
  }
  return results;
}

// Swaps every <aialter>/<aiadd>/<highlight> tag for a plain-text sentinel, indexed in
// the same left-to-right order findAlterations()/findAdditions()/findHighlights() use,
// so they all stay in sync.
//
// The <notest> tags are different: they wrap ordinary Markdown (bold, math, several paragraphs)
// instead of holding plain text, so the opening and the closing tag each become their own
// sentinel and the text between them is parsed as usual.
export function prepareContentForRendering(markdown: string): string {
  let alterI = 0;
  let addI = 0;
  let highlightI = 0;
  return markdown
    .replace(combinedPattern(), (_match, alterOriginal, _alterCorrected, addText, highlightColor) => {
      if (alterOriginal !== undefined) return ALTER_SENTINEL(alterI++);
      if (addText !== undefined) return ADD_SENTINEL(addI++);
      if (highlightColor !== undefined) return HIGHLIGHT_SENTINEL(highlightI++);
      return "";
    })
    .replace(NO_TEST_OPEN_PATTERN, NO_TEST_OPEN_SENTINEL)
    .replace(NO_TEST_CLOSE_PATTERN, NO_TEST_CLOSE_SENTINEL);
}

export type AlterationAction = "accept" | "reject" | "manual";

// Replaces one <aialter> occurrence (by its 0-based order in the document) with the
// corrected text (accept), the original text (reject), or the reader's own typed
// correction (manual - used when the AI's guess was itself wrong). Unwraps the tag
// either way, so once resolved it's indistinguishable from text the student typed.
export function resolveAlteration(
  markdown: string,
  targetIndex: number,
  action: AlterationAction,
  manualText?: string
): string {
  let i = -1;
  return markdown.replace(new RegExp(AI_ALTER_PATTERN.source, "gi"), (match, original, corrected) => {
    i++;
    if (i !== targetIndex) return match;
    if (action === "manual") return manualText ?? corrected;
    return action === "accept" ? corrected : original;
  });
}

export function resolveAllAlterations(markdown: string, action: "accept" | "reject"): string {
  return markdown.replace(new RegExp(AI_ALTER_PATTERN.source, "gi"), (_match, original, corrected) =>
    action === "accept" ? corrected : original
  );
}

// Deletes one <aiadd> occurrence entirely (by its 0-based order in the document).
export function removeAddition(markdown: string, targetIndex: number): string {
  let i = -1;
  return markdown.replace(new RegExp(AI_ADD_PATTERN.source, "gi"), (match) => {
    i++;
    return i === targetIndex ? "" : match;
  });
}
