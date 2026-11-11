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
const HIGHLIGHT_TAG_PATTERN = /<highlight\s+color="(yellow|blue|green|red|purple|orange)"\s*>|<\/highlight>/gi;

// Only the two review markers hold opaque text. <highlight> (like ==...==) holds ordinary
// Markdown, so its tags are turned into open/close sentinels instead (see below).
function combinedPattern(): RegExp {
  return new RegExp(`${AI_ALTER_PATTERN.source}|${AI_ADD_PATTERN.source}`, "gi");
}

// Wrapped in a Private-Use-Area character (U+E000) on both sides: not valid CommonMark
// syntax, so it always survives markdown parsing as plain text, and the wrapper makes
// collisions with real note content (e.g. "Vitamin D3", "Room A0") effectively impossible.
const PUA = String.fromCharCode(0xe000);
const ALTER_SENTINEL = (i: number) => `${PUA}A${i}${PUA}`;
const ADD_SENTINEL = (i: number) => `${PUA}D${i}${PUA}`;
export const SENTINEL_PATTERN = new RegExp(`${PUA}([AD])(\\d+)${PUA}`, "g");

export type HighlightColor = "yellow" | "blue" | "green" | "red" | "purple" | "orange";

// <highlight color="...">...</highlight> and ==...== hold ordinary Markdown (bold, italic, code,
// math, AI-added text, another highlight), so each tag becomes an open or a close sentinel and
// the text between them is parsed as usual. The sentinels are private-use characters between
// two rare punctuation marks: Markdown only opens or closes **bold** next to a tag when the tag
// looks like punctuation to it, e.g. in <highlight color="red">**"quoted"**</highlight>.
const HIGHLIGHT_LETTERS: Record<HighlightColor, string> = { yellow: "Y", blue: "B", green: "G", red: "R", purple: "P", orange: "O" };
const HIGHLIGHT_BY_LETTER = Object.fromEntries(Object.entries(HIGHLIGHT_LETTERS).map(([color, letter]) => [letter, color])) as Record<string, HighlightColor>;
const HIGHLIGHT_OPEN_SENTINEL = (color: HighlightColor) => `\u2e22${String.fromCharCode(0xe003)}${HIGHLIGHT_LETTERS[color]}\u2e22`;
const HIGHLIGHT_CLOSE_SENTINEL = `\u2e23${String.fromCharCode(0xe004)}\u2e23`;
export const HIGHLIGHT_SENTINEL_PATTERN = new RegExp(
  `\u2e22${String.fromCharCode(0xe003)}[YBGRPO]\u2e22|${HIGHLIGHT_CLOSE_SENTINEL}`,
  "g"
);

// What a highlight sentinel found in text stands for: the colour it starts, or "close".
export function parseHighlightSentinel(sentinel: string): HighlightColor | "close" {
  return sentinel === HIGHLIGHT_CLOSE_SENTINEL ? "close" : (HIGHLIGHT_BY_LETTER[sentinel.charAt(2)] ?? "blue");
}

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

// Swaps every <aialter>/<aiadd> tag for a plain-text sentinel, indexed in the same left-to-right
// order findAlterations()/findAdditions() use, so they stay in sync. <highlight> tags become open
// and close sentinels (an unmatched tag is dropped), nested to any depth - the colour of the
// innermost one applies.
//
// The <notest> tags are different from the review markers too: they wrap ordinary Markdown
// (bold, math, several paragraphs) instead of holding plain text, so the opening and the
// closing tag each become their own sentinel and the text between them is parsed as usual.
export function prepareContentForRendering(markdown: string): string {
  let alterI = 0;
  let addI = 0;
  return convertHighlightTags(
    markdown.replace(combinedPattern(), (_match, alterOriginal, _alterCorrected, addText) => {
      if (alterOriginal !== undefined) return ALTER_SENTINEL(alterI++);
      if (addText !== undefined) return ADD_SENTINEL(addI++);
      return "";
    })
  )
    .replace(NO_TEST_OPEN_PATTERN, NO_TEST_OPEN_SENTINEL)
    .replace(NO_TEST_CLOSE_PATTERN, NO_TEST_CLOSE_SENTINEL);
}

function convertHighlightTags(markdown: string): string {
  const tags = [...markdown.matchAll(new RegExp(HIGHLIGHT_TAG_PATTERN.source, "gi"))];
  if (tags.length === 0) return markdown;

  const open: number[] = [];
  const pairs = new Map<number, "open" | "close">();
  tags.forEach((tag, i) => {
    if (tag[1] !== undefined) open.push(i);
    else if (open.length > 0) {
      pairs.set(open.pop()!, "open");
      pairs.set(i, "close");
    }
  });

  let result = "";
  let last = 0;
  tags.forEach((tag, i) => {
    result += markdown.slice(last, tag.index);
    const role = pairs.get(i);
    if (role === "open") result += HIGHLIGHT_OPEN_SENTINEL(tag[1].toLowerCase() as HighlightColor);
    else if (role === "close") result += HIGHLIGHT_CLOSE_SENTINEL;
    last = tag.index! + tag[0].length;
  });
  return result + markdown.slice(last);
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
