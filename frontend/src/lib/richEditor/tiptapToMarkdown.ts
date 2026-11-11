import { NO_TEST_CLOSE_TAG, NO_TEST_OPEN_TAG } from "@/lib/aiMarkup";
import type { TiptapMark, TiptapNode } from "@/lib/richEditor/markdownToTiptap";

// Backslash-escapes characters that would otherwise be re-interpreted as Markdown syntax
// on the next load - includes < and > so a literal angle bracket in plain text can never
// be mistaken for one of this app's own <highlight>/<aialter> tags by the read pipeline
// (which has no rehype-raw, so a stray real HTML-looking tag would just vanish).
const ESCAPE_CHARS = /[\\`*_~<>]/g;
function escapeText(text: string): string {
  return text.replace(ESCAPE_CHARS, "\\$&");
}

function wrapInlineCode(text: string): string {
  const runs = text.match(/`+/g) || [];
  const maxRun = runs.reduce((max, run) => Math.max(max, run.length), 0);
  const fence = "`".repeat(maxRun + 1);
  const pad = text.startsWith("`") || text.endsWith("`") || text === "" ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

// Marks that wrap text in Markdown, as a key (what a piece of text carries) with what opens and
// closes it. Bold, italic, strike, highlight, AI-added, "not in tests" and links nest in any order, and
// the read pipeline parses what is inside every one of them as ordinary Markdown.
function markKeysOf(marks: TiptapMark[]): string[] {
  const keys: string[] = [];
  for (const mark of marks) {
    if (mark.type === "link") keys.push(`link:${(mark.attrs?.href as string) || ""}`);
    else if (mark.type === "noTest") keys.push("noTest");
    else if (mark.type === "aiAdd") keys.push("aiAdd");
    else if (mark.type === "highlight") keys.push(`highlight:${(mark.attrs?.color as string) || "blue"}`);
    else if (mark.type === "bold") keys.push("bold");
    else if (mark.type === "italic") keys.push("italic");
    else if (mark.type === "strike") keys.push("strike");
  }
  return keys;
}

// A key that opens and closes next to a word, so it can't have a space just inside it.
const FLANKING_KEYS = ["bold", "italic", "strike"];

function openMarker(key: string): string {
  if (key === "bold") return "**";
  if (key === "italic") return "*";
  if (key === "strike") return "~~";
  if (key === "noTest") return NO_TEST_OPEN_TAG;
  if (key === "aiAdd") return "<aiadd>";
  if (key === "highlight:blue") return "==";
  if (key.startsWith("highlight:")) return `<highlight color="${key.slice("highlight:".length)}">`;
  return "[";
}

function closeMarker(key: string): string {
  if (key === "noTest") return NO_TEST_CLOSE_TAG;
  if (key === "aiAdd") return "</aiadd>";
  if (key.startsWith("highlight:") && key !== "highlight:blue") return "</highlight>";
  if (key.startsWith("link:")) return `](${key.slice("link:".length).replace(/[()\s]/g, (c) => encodeURIComponent(c))})`;
  return openMarker(key);
}

// Outermost first when two marks start at the same place and cover the same stretch.
const KEY_ORDER = ["link", "noTest", "aiAdd", "highlight", "bold", "italic", "strike"];
const keyRank = (key: string) => KEY_ORDER.indexOf(key.split(":")[0]);

interface Piece {
  lead: string;
  core: string;
  trail: string;
  keys: string[];
  /** Set when the piece is nothing but spaces, which then take their marks from their neighbours. */
  space?: string;
}

const isSpaceOnly = (piece: Piece) => piece.space !== undefined;

function splitSpaces(text: string): [string, string, string] {
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
  return [lead, core, trail];
}

// One piece of text per Tiptap node, with the marks it carries as keys.
function piecesOf(nodes: TiptapNode[]): Piece[] {
  const pieces: Piece[] = [];
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      pieces.push({ lead: "", core: "  \n", trail: "", keys: [] });
      continue;
    }

    const marks = node.marks || [];
    const keys = markKeysOf(marks);
    const flanking = keys.some((k) => FLANKING_KEYS.includes(k));

    let text: string;
    let raw = false;
    if (node.type === "mathInline") {
      text = `$${(node.attrs?.latex as string) || ""}$`;
      raw = true;
    } else if (node.type === "text" && marks.some((m) => m.type === "code")) {
      text = wrapInlineCode(node.text || "");
      raw = true;
    } else if (node.type === "text") {
      text = node.text || "";
    } else {
      continue;
    }

    // Spaces at the edge of a bold/italic/strike piece go outside the markers: Markdown doesn't
    // open or close emphasis next to a space.
    const [lead, core, trail] = flanking && !raw ? splitSpaces(text) : ["", text, ""];
    if (flanking && !raw && core === "") pieces.push({ lead: "", core: "", trail: "", keys, space: text });
    else pieces.push({ lead, core: raw ? core : escapeText(core), trail, keys });
  }

  // A space between two pieces that are both bold (or italic, strike) is bold with them, so the
  // markers carry on across it instead of closing and opening again around a space.
  pieces.forEach((piece, i) => {
    if (!isSpaceOnly(piece)) return;
    const before = [...pieces.slice(0, i)].reverse().find((p) => !isSpaceOnly(p));
    const after = pieces.slice(i + 1).find((p) => !isSpaceOnly(p));
    piece.keys = piece.keys.filter((k) => !FLANKING_KEYS.includes(k));
    for (const key of FLANKING_KEYS) {
      if (before?.keys.includes(key) && after?.keys.includes(key)) piece.keys.push(key);
    }
  });
  return pieces;
}

// Writes the pieces with every mark opened once for as long as it lasts, however the other marks
// start and stop inside it: ==a **b** c== for a highlight with bold in the middle.
//
// Bold, italic and strike can't have a space just inside them, so the spaces at the edge of a
// piece are written outside those markers (but still inside a highlight or a "not in tests"
// region that is wrapped around them, when that is the outer one).
function serializeInline(nodes: TiptapNode[]): string {
  const pieces = piecesOf(nodes);
  const active: string[] = [];
  let out = "";
  let pendingTrail = "";

  // How many pieces from this one on keep a mark going.
  const spanFrom = (index: number, key: string) => {
    let n = 0;
    while (index + n < pieces.length && pieces[index + n].keys.includes(key)) n++;
    return n;
  };

  const isFlanking = (key: string) => FLANKING_KEYS.includes(key);

  // A space that was written inside bold/italic/strike (one between two pieces that share it) is
  // moved after the closing marker when that marker comes next: Markdown doesn't close it after a space.
  const movePendingSpacesOutOfClosing = (closing: string[]) => {
    if (closing.length === 0 || !isFlanking(closing[0])) return;
    const spaces = /\s+$/.exec(out);
    if (!spaces || spaces.index === 0) return;
    pendingTrail = spaces[0] + pendingTrail;
    out = out.slice(0, spaces.index);
  };

  pieces.forEach((piece, i) => {
    // Keep the marks already open that this piece still has, up to the first that it doesn't.
    let keep = 0;
    while (keep < active.length && piece.keys.includes(active[keep])) keep++;

    let wanted = piece.keys;
    let lead = piece.lead;
    let core = piece.core;
    if (isSpaceOnly(piece)) {
      // Spaces never open bold, italic or strike (nothing could follow them inside); inside the
      // ones that are open they are part of the text, otherwise they are written on their own.
      wanted = piece.keys.filter((k) => !isFlanking(k) || active.slice(0, keep).includes(k));
      if (wanted.length > 0) core = piece.space!;
      else lead = piece.space!;
    }

    const toOpen = wanted
      .filter((key) => !active.slice(0, keep).includes(key))
      .sort((a, b) => spanFrom(i, b) - spanFrom(i, a) || keyRank(a) - keyRank(b));
    const toClose = active.splice(keep).reverse();

    // The previous piece's trailing space goes after the last bold/italic/strike that closes here,
    // never straight after one: Markdown doesn't close emphasis next to a space.
    movePendingSpacesOutOfClosing(toClose);
    const lastFlankingClose = toClose.map(isFlanking).lastIndexOf(true);
    out += toClose.slice(0, lastFlankingClose + 1).map(closeMarker).join("");
    out += pendingTrail;
    out += toClose.slice(lastFlankingClose + 1).map(closeMarker).join("");
    pendingTrail = "";

    // This piece's leading space goes before the first bold/italic/strike that opens here, and
    // after any highlight (or other tag) that opens before it.
    const firstFlankingOpen = toOpen.findIndex(isFlanking);
    const outer = firstFlankingOpen === -1 ? toOpen : toOpen.slice(0, firstFlankingOpen);
    const inner = firstFlankingOpen === -1 ? [] : toOpen.slice(firstFlankingOpen);
    out += outer.map(openMarker).join("") + lead + inner.map(openMarker).join("");
    active.push(...toOpen);

    out += core;
    pendingTrail = piece.trail;
  });

  const rest = active.splice(0).reverse();
  movePendingSpacesOutOfClosing(rest);
  const lastFlankingClose = rest.map(isFlanking).lastIndexOf(true);
  out += rest.slice(0, lastFlankingClose + 1).map(closeMarker).join("") + pendingTrail;
  return out + rest.slice(lastFlankingClose + 1).map(closeMarker).join("");
}

function wrapNoTestBlock(markdown: string, node: TiptapNode): string {
  return node.attrs?.noTest ? `${NO_TEST_OPEN_TAG}\n\n${markdown}\n\n${NO_TEST_CLOSE_TAG}` : markdown;
}

function prefixLines(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? prefix + line : prefix.trimEnd()))
    .join("\n");
}

function serializeListItem(item: TiptapNode, marker: string): string {
  const children = (item.content || []).map((c) => ({ type: c.type, text: serializeBlock(c) })).filter((b) => b.text.length > 0);
  if (children.length === 0) return marker.trimEnd();

  // A list nested under its item's text stays tight (no blank line), so reading it back doesn't
  // turn the whole list into a loose one with space between the items.
  const isList = (type: string) => type === "bulletList" || type === "orderedList";
  const body = children.reduce(
    (text, child, i) => (i === 0 ? child.text : `${text}${isList(child.type) && children[i - 1].type === "paragraph" ? "\n" : "\n\n"}${child.text}`),
    ""
  );

  const indent = " ".repeat(marker.length);
  const withIndent = prefixLines(body, indent);
  return marker + withIndent.slice(indent.length);
}

function cellInlineNodes(cell: TiptapNode): TiptapNode[] {
  return cell.content?.[0]?.content || [];
}

function serializeTable(node: TiptapNode): string {
  const rows = node.content || [];
  if (rows.length === 0) return "";

  const cellsOf = (row: TiptapNode) =>
    (row.content || []).map((cell) => serializeInline(cellInlineNodes(cell)).replace(/\n/g, " ").replace(/\|/g, "\\|"));

  const headerCells = cellsOf(rows[0]);
  const lines = [
    `| ${headerCells.join(" | ")} |`,
    `| ${headerCells.map(() => "---").join(" | ")} |`,
    ...rows.slice(1).map((row) => `| ${cellsOf(row).join(" | ")} |`),
  ];
  return lines.join("\n");
}

function serializeBlock(node: TiptapNode): string {
  switch (node.type) {
    case "paragraph":
      return serializeInline(node.content || []);
    case "heading": {
      const level = Math.min(3, Math.max(2, (node.attrs?.level as number) || 2));
      return `${"#".repeat(level)} ${serializeInline(node.content || [])}`;
    }
    case "horizontalRule":
      return "---";
    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const text = (node.content || []).map((c) => c.text || "").join("");
      const runs = text.match(/`+/g) || [];
      const maxRun = runs.reduce((max, run) => Math.max(max, run.length), 0);
      const fence = "`".repeat(Math.max(3, maxRun + 1));
      return wrapNoTestBlock(`${fence}${lang}\n${text}\n${fence}`, node);
    }
    case "blockquote": {
      const inner = (node.content || []).map((c) => serializeBlock(c)).join("\n\n");
      return prefixLines(inner, "> ");
    }
    case "callout": {
      const variant = ((node.attrs?.variant as string) || "note").toUpperCase();
      const inner = (node.content || []).map((c) => serializeBlock(c)).join("\n\n");
      return prefixLines(`[!${variant}]\n${inner}`, "> ");
    }
    case "bulletList":
      return (node.content || []).map((item) => serializeListItem(item, "- ")).join("\n");
    case "orderedList":
      return (node.content || []).map((item, i) => serializeListItem(item, `${i + 1}. `)).join("\n");
    case "table":
      return serializeTable(node);
    case "mathBlock":
      return wrapNoTestBlock(`$$\n${(node.attrs?.latex as string) || ""}\n$$`, node);
    default:
      return "";
  }
}

// Converts a Tiptap/ProseMirror JSON document (produced by this app's own schema - see
// markdownToTiptap.ts) back into this app's exact Markdown dialect.
export function tiptapToMarkdown(doc: TiptapNode): string {
  const blocks = (doc.content || []).map((node) => serializeBlock(node)).filter((b) => b.length > 0);
  return blocks.join("\n\n") + (blocks.length > 0 ? "\n" : "");
}
