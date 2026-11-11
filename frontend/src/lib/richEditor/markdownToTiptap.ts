import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Blockquote, Content, List, PhrasingContent, Root, Table, TableRow, Text } from "mdast";
import {
  HIGHLIGHT_SENTINEL_PATTERN,
  NO_TEST_OPEN_SENTINEL,
  NO_TEST_SENTINEL_PATTERN,
  parseHighlightSentinel,
  parseReviewSentinel,
  prepareContentForRendering,
  REVIEW_SENTINEL_PATTERN,
  type HighlightColor,
} from "@/lib/aiMarkup";
import { collectTexts, EQUALS_TOKEN, equalsRoles, type EqualsRole } from "@/lib/highlightSyntax";
import { CALLOUT_PATTERN, CALLOUT_TYPES } from "@/lib/remarkCallouts";

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

// Converts this app's Markdown dialect into a Tiptap/ProseMirror JSON document. Assumes
// the caller has already ruled out pending <aialter> corrections (see the "Format visually"
// guard in NotePage.tsx) - those are never modeled here. What is inside <aiadd>...</aiadd> becomes
// text with the aiAdd mark (and any other marks it has) and is written back out by
// tiptapToMarkdown.ts.
//
// How many <aiadd> tags are open around the text being converted - they carry on from block to
// block like the regions below.
let openAiAdds = 0;

// Whether the conversion is currently between a <notest> and its </notest>. The blocks are
// converted in reading order, so a region may start in one block and end in a later one;
// everything passed while it's on gets the noTest mark (or, for blocks that can't carry
// marks, the noTest attribute) - mirrors remarkNoTest.ts.
let insideNoTest = false;

// The highlights currently open - ==...== and <highlight color="..."> - nest to any depth and
// the innermost colour applies. Like insideNoTest they carry on from block to block - mirrors
// remarkHighlight.ts.
interface ActiveHighlight {
  color: HighlightColor;
  kind: "equals" | "tag";
}
let openHighlights: ActiveHighlight[] = [];

// How each "==" of the paragraph being converted pairs up (see highlightSyntax.ts), and how
// many texts of it have been converted so far.
let equalsOfParagraph: EqualsRole[][] = [];
let equalsTextIndex = 0;

function closeHighlight(kind: ActiveHighlight["kind"]) {
  for (let i = openHighlights.length - 1; i >= 0; i--) {
    if (openHighlights[i].kind === kind) return void openHighlights.splice(i, 1);
  }
}

// The marks a piece of text gets from the regions that are open around it, on top of its own.
function withRegions(marks: TiptapMark[]): TiptapMark[] {
  const all = marks.filter((m) => m.type !== "highlight" || !openHighlights.length);
  const color = openHighlights[openHighlights.length - 1]?.color;
  if (color) all.push({ type: "highlight", attrs: { color } });
  if (openAiAdds > 0) all.push({ type: "aiAdd" });
  if (insideNoTest) all.push({ type: "noTest" });
  return all;
}

function marksProp(marks: TiptapMark[]): { marks?: TiptapMark[] } {
  const all = withRegions(marks);
  return all.length ? { marks: all } : {};
}

// Converts the inline content of one paragraph, heading or table cell.
function convertInlineContainer(children: PhrasingContent[]): TiptapNode[] {
  equalsOfParagraph = equalsRoles(collectTexts(children).map((t) => t.value));
  equalsTextIndex = 0;
  return convertInline(children);
}

export function markdownToTiptap(markdown: string): TiptapNode {
  openAiAdds = 0;
  insideNoTest = false;
  openHighlights = [];
  const sentinelSource = prepareContentForRendering(markdown);
  const tree = processor.parse(sentinelSource) as Root;
  const content = tree.children.flatMap((node) => convertBlock(node));
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

function detectCalloutVariant(node: Blockquote): string | null {
  const firstParagraph = node.children[0];
  if (!firstParagraph || firstParagraph.type !== "paragraph") return null;
  const firstText = firstParagraph.children[0];
  if (!firstText || firstText.type !== "text") return null;
  const match = CALLOUT_PATTERN.exec(firstText.value);
  if (!match) return null;
  const variant = match[1].toLowerCase();
  return CALLOUT_TYPES.has(variant) ? variant : null;
}

// Strips the leading "[!VARIANT]" text from the callout blockquote's first paragraph,
// returning the remaining child block nodes (mirrors remarkCallouts.ts exactly).
function stripCalloutPrefix(node: Blockquote): Content[] {
  const children = [...node.children];
  const firstParagraph = children[0];
  if (firstParagraph.type !== "paragraph") return children;

  const paragraphChildren = [...firstParagraph.children];
  const firstText = paragraphChildren[0] as Text;
  const match = CALLOUT_PATTERN.exec(firstText.value);
  if (!match) return children;

  const newValue = firstText.value.slice(match[0].length);
  if (newValue) {
    paragraphChildren[0] = { ...firstText, value: newValue };
  } else {
    paragraphChildren.shift();
  }

  if (paragraphChildren.length > 0) {
    children[0] = { ...firstParagraph, children: paragraphChildren };
  } else {
    children.shift();
  }
  return children;
}

function convertBlock(node: Content): TiptapNode[] {
  switch (node.type) {
    case "paragraph": {
      const content = convertInlineContainer(node.children);
      // A <notest> tag on a line of its own leaves a paragraph with nothing in it.
      if (!content.length && node.children.length) return [];
      return [{ type: "paragraph", ...(content.length ? { content } : {}) }];
    }
    case "heading": {
      const level = Math.min(3, Math.max(2, node.depth)) as 2 | 3;
      const content = convertInlineContainer(node.children);
      return [{ type: "heading", attrs: { level }, ...(content.length ? { content } : {}) }];
    }
    case "thematicBreak":
      return [{ type: "horizontalRule" }];
    case "code":
      return [
        {
          type: "codeBlock",
          attrs: { language: node.lang || null, noTest: insideNoTest },
          ...(node.value ? { content: [{ type: "text", text: node.value }] } : {}),
        },
      ];
    case "blockquote": {
      const variant = detectCalloutVariant(node);
      if (variant) {
        const remaining = stripCalloutPrefix(node);
        const content = remaining.flatMap((c) => convertBlock(c));
        return [{ type: "callout", attrs: { variant }, content: content.length ? content : [{ type: "paragraph" }] }];
      }
      const content = node.children.flatMap((c) => convertBlock(c));
      return [{ type: "blockquote", content: content.length ? content : [{ type: "paragraph" }] }];
    }
    case "list": {
      const list = node as List;
      const items = list.children.map((item) => {
        const content = item.children.flatMap((c) => convertBlock(c));
        return { type: "listItem", content: content.length ? content : [{ type: "paragraph" }] };
      });
      return [{ type: list.ordered ? "orderedList" : "bulletList", content: items }];
    }
    case "table": {
      const table = node as Table;
      const rows = table.children.map((row: TableRow, rowIndex: number) => ({
        type: "tableRow",
        content: row.children.map((cell) => {
          const cellContent = convertInlineContainer(cell.children);
          return {
            type: rowIndex === 0 ? "tableHeader" : "tableCell",
            content: [{ type: "paragraph", ...(cellContent.length ? { content: cellContent } : {}) }],
          };
        }),
      }));
      return [{ type: "table", content: rows }];
    }
    case "math":
      return [{ type: "mathBlock", attrs: { latex: node.value, noTest: insideNoTest } }];
    case "html":
      // Defensive fallback only - the pending-review guard and highlight-tag sentinel
      // substitution mean no known syntax should ever reach here as raw HTML.
      return node.value.trim() ? [{ type: "paragraph", content: [{ type: "text", text: node.value }] }] : [];
    default:
      return [];
  }
}

// Splits a text value on the open/close sentinels left by prepareContentForRendering() for
// <highlight color="..."> tags, on "==" (paired up beforehand - see highlightSyntax.ts) and on the
// <aiadd> and <notest> sentinels, applying any marks already active from an enclosing
// strong/emphasis/etc. Mirrors remarkHighlight.ts, remarkAiMarkup.ts and remarkNoTest.ts.
function convertText(value: string, marks: TiptapMark[]): TiptapNode[] {
  const equalsOf = equalsOfParagraph[equalsTextIndex++] ?? [];
  const combined = new RegExp(
    `${REVIEW_SENTINEL_PATTERN.source}|${HIGHLIGHT_SENTINEL_PATTERN.source}|${NO_TEST_SENTINEL_PATTERN.source}|${EQUALS_TOKEN}`,
    "g"
  );
  const result: TiptapNode[] = [];
  let equalsIndex = 0;
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  const pushPlain = (text: string) => {
    if (text) result.push({ type: "text", text, ...marksProp(marks) });
  };

  while ((match = combined.exec(value))) {
    pushPlain(value.slice(lastEnd, match.index));
    lastEnd = combined.lastIndex;
    const token = match[0];

    if (token.charAt(0) === "\u2e24" || token.charAt(0) === "\u2e25") {
      const { kind, open } = parseReviewSentinel(token);
      if (kind === "D") openAiAdds = Math.max(0, openAiAdds + (open ? 1 : -1));
    } else if (token === NO_TEST_OPEN_SENTINEL) {
      insideNoTest = true;
    } else if (token === EQUALS_TOKEN) {
      const role = equalsOf[equalsIndex++];
      if (role === "open") openHighlights.push({ color: "blue", kind: "equals" });
      else if (role === "close") closeHighlight("equals");
      else pushPlain(EQUALS_TOKEN);
    } else if (token.charAt(0) === "\u2e22" || token.charAt(0) === "\u2e23") {
      const color = parseHighlightSentinel(token);
      if (color === "close") closeHighlight("tag");
      else openHighlights.push({ color, kind: "tag" });
    } else {
      insideNoTest = false;
    }
  }

  pushPlain(value.slice(lastEnd));
  return result;
}

function convertInline(nodes: PhrasingContent[], marks: TiptapMark[] = []): TiptapNode[] {
  const result: TiptapNode[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        result.push(...convertText(node.value, marks));
        break;
      case "strong":
        result.push(...convertInline(node.children, [...marks, { type: "bold" }]));
        break;
      case "emphasis":
        result.push(...convertInline(node.children, [...marks, { type: "italic" }]));
        break;
      case "delete":
        result.push(...convertInline(node.children, [...marks, { type: "strike" }]));
        break;
      case "inlineCode":
        // Inline code takes every mark but the AI-added one (see extensions.ts).
        result.push({ type: "text", text: node.value, marks: withRegions([...marks, { type: "code" }]) });
        break;
      case "break":
        result.push({ type: "hardBreak" });
        break;
      case "inlineMath":
        result.push({ type: "mathInline", attrs: { latex: node.value }, ...marksProp(marks) });
        break;
      case "link":
        result.push(...convertInline(node.children, [...marks, { type: "link", attrs: { href: node.url } }]));
        break;
      default:
        // Anything else that holds text keeps it rather than dropping it.
        if ("children" in node && Array.isArray(node.children)) result.push(...convertInline(node.children as PhrasingContent[], marks));
        break;
    }
  }

  return result;
}
