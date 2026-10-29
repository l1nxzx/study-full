import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Blockquote, Content, List, PhrasingContent, Root, Table, TableRow, Text } from "mdast";
import { findHighlights, prepareContentForRendering, SENTINEL_PATTERN, type AiHighlight } from "@/lib/aiMarkup";
import { CALLOUT_PATTERN, CALLOUT_TYPES } from "@/lib/remarkCallouts";
import { MARK_PATTERN } from "@/lib/remarkHighlightMark";

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
// the caller has already ruled out pending <aialter>/<aiadd> review tags (see the
// "Format" button's guard in NotePage.tsx) - those are never modeled here.
export function markdownToTiptap(markdown: string): TiptapNode {
  const highlights = findHighlights(markdown);
  const sentinelSource = prepareContentForRendering(markdown);
  const tree = processor.parse(sentinelSource) as Root;
  const content = tree.children.flatMap((node) => convertBlock(node, highlights));
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

function convertBlock(node: Content, highlights: AiHighlight[]): TiptapNode[] {
  switch (node.type) {
    case "paragraph": {
      const content = convertInline(node.children, highlights);
      return [{ type: "paragraph", ...(content.length ? { content } : {}) }];
    }
    case "heading": {
      const level = Math.min(3, Math.max(2, node.depth)) as 2 | 3;
      const content = convertInline(node.children, highlights);
      return [{ type: "heading", attrs: { level }, ...(content.length ? { content } : {}) }];
    }
    case "thematicBreak":
      return [{ type: "horizontalRule" }];
    case "code":
      return [
        {
          type: "codeBlock",
          attrs: { language: node.lang || null },
          ...(node.value ? { content: [{ type: "text", text: node.value }] } : {}),
        },
      ];
    case "blockquote": {
      const variant = detectCalloutVariant(node);
      if (variant) {
        const remaining = stripCalloutPrefix(node);
        const content = remaining.flatMap((c) => convertBlock(c, highlights));
        return [{ type: "callout", attrs: { variant }, content: content.length ? content : [{ type: "paragraph" }] }];
      }
      const content = node.children.flatMap((c) => convertBlock(c, highlights));
      return [{ type: "blockquote", content: content.length ? content : [{ type: "paragraph" }] }];
    }
    case "list": {
      const list = node as List;
      const items = list.children.map((item) => ({
        type: "listItem",
        content: item.children.flatMap((c) => convertBlock(c, highlights)),
      }));
      return [{ type: list.ordered ? "orderedList" : "bulletList", content: items }];
    }
    case "table": {
      const table = node as Table;
      const rows = table.children.map((row: TableRow, rowIndex: number) => ({
        type: "tableRow",
        content: row.children.map((cell) => {
          const cellContent = convertInline(cell.children, highlights);
          return {
            type: rowIndex === 0 ? "tableHeader" : "tableCell",
            content: [{ type: "paragraph", ...(cellContent.length ? { content: cellContent } : {}) }],
          };
        }),
      }));
      return [{ type: "table", content: rows }];
    }
    case "math":
      return [{ type: "mathBlock", attrs: { latex: node.value } }];
    case "html":
      // Defensive fallback only - the pending-review guard and highlight-tag sentinel
      // substitution mean no known syntax should ever reach here as raw HTML.
      return node.value.trim() ? [{ type: "paragraph", content: [{ type: "text", text: node.value }] }] : [];
    default:
      return [];
  }
}

function findHighlightByIndex(highlights: AiHighlight[], index: number): AiHighlight | undefined {
  return highlights.find((h) => h.index === index);
}

// Splits a text value on both the ==highlight== shorthand (a live regex pass) and the
// sentinel markers left by prepareContentForRendering() for <highlight color="..."> tags
// (an indexed lookup, exactly mirroring remarkAiMarkup.ts), applying any marks already
// active from an enclosing strong/emphasis/etc.
function convertText(value: string, highlights: AiHighlight[], marks: TiptapMark[]): TiptapNode[] {
  const combined = new RegExp(`${SENTINEL_PATTERN.source}|${MARK_PATTERN.source}`, "g");
  const result: TiptapNode[] = [];
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(value))) {
    if (match.index > lastEnd) {
      const plain = value.slice(lastEnd, match.index);
      if (plain) result.push({ type: "text", text: plain, ...(marks.length ? { marks } : {}) });
    }

    const [, sentinelKind, sentinelIndex, markText] = match;
    if (sentinelKind === "H" && sentinelIndex !== undefined) {
      const highlight = findHighlightByIndex(highlights, Number(sentinelIndex));
      if (highlight?.text) {
        result.push({
          type: "text",
          text: highlight.text,
          marks: [...marks, { type: "highlight", attrs: { color: highlight.color } }],
        });
      }
    } else if (markText !== undefined) {
      result.push({ type: "text", text: markText, marks: [...marks, { type: "highlight", attrs: { color: "blue" } }] });
    }

    lastEnd = combined.lastIndex;
  }

  if (lastEnd < value.length) {
    const plain = value.slice(lastEnd);
    if (plain) result.push({ type: "text", text: plain, ...(marks.length ? { marks } : {}) });
  }

  return result;
}

function convertInline(nodes: PhrasingContent[], highlights: AiHighlight[], marks: TiptapMark[] = []): TiptapNode[] {
  const result: TiptapNode[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        result.push(...convertText(node.value, highlights, marks));
        break;
      case "strong":
        result.push(...convertInline(node.children, highlights, [...marks, { type: "bold" }]));
        break;
      case "emphasis":
        result.push(...convertInline(node.children, highlights, [...marks, { type: "italic" }]));
        break;
      case "delete":
        result.push(...convertInline(node.children, highlights, [...marks, { type: "strike" }]));
        break;
      case "inlineCode":
        result.push({ type: "text", text: node.value, marks: [...marks, { type: "code" }] });
        break;
      case "break":
        result.push({ type: "hardBreak" });
        break;
      case "inlineMath":
        result.push({ type: "mathInline", attrs: { latex: node.value } });
        break;
      case "link":
        // Links aren't part of this app's authoring conventions yet - degrade to plain
        // text rather than silently dropping the label.
        result.push(...convertInline(node.children, highlights, marks));
        break;
      default:
        break;
    }
  }

  return result;
}
