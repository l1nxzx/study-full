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

// Code excludes every other mark in the schema (see highlightMark.ts's neighbor,
// @tiptap/extension-code's `excludes: "_"`), so it's handled first and alone. Highlight
// wraps innermost (its tag content is treated as opaque plain text by the read
// pipeline - see aiMarkup.ts - so anything markdown-ish placed *inside* it wouldn't
// round-trip), strike/italic/bold wrap outward from there.
function wrapWithMarks(text: string, marks: TiptapMark[]): string {
  if (marks.some((m) => m.type === "code")) return wrapInlineCode(text);

  // AI-added text is read back as opaque plain text (see aiMarkup.ts), so it isn't escaped;
  // only a literal closing tag inside it would break the marker.
  const aiAdd = marks.some((m) => m.type === "aiAdd");
  let result = aiAdd ? `<aiadd>${text.replace(/<\/aiadd>/gi, "")}</aiadd>` : escapeText(text);

  // Highlight and AI-added are both opaque tags that can't nest; the AI marker wins.
  const highlight = aiAdd ? undefined : marks.find((m) => m.type === "highlight");
  if (highlight) {
    const color = (highlight.attrs?.color as string) || "blue";
    result = color === "blue" ? `==${result}==` : `<highlight color="${color}">${result}</highlight>`;
  }
  if (marks.some((m) => m.type === "strike")) result = `~~${result}~~`;
  if (marks.some((m) => m.type === "italic")) result = `*${result}*`;
  if (marks.some((m) => m.type === "bold")) result = `**${result}**`;

  return result;
}

function serializeInline(nodes: TiptapNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return wrapWithMarks(node.text || "", node.marks || []);
      if (node.type === "hardBreak") return "  \n";
      if (node.type === "mathInline") return `$${(node.attrs?.latex as string) || ""}$`;
      return "";
    })
    .join("");
}

function prefixLines(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? prefix + line : prefix.trimEnd()))
    .join("\n");
}

function serializeListItem(item: TiptapNode, marker: string): string {
  const blocks = (item.content || []).map((c) => serializeBlock(c)).filter((b) => b.length > 0);
  if (blocks.length === 0) return marker.trimEnd();

  const indent = " ".repeat(marker.length);
  const withIndent = prefixLines(blocks.join("\n\n"), indent);
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
      return `${fence}${lang}\n${text}\n${fence}`;
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
      return `$$\n${(node.attrs?.latex as string) || ""}\n$$`;
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
