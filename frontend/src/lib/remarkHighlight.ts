import { HIGHLIGHT_SENTINEL_PATTERN, parseHighlightSentinel, type HighlightColor } from "./aiMarkup";
import { collectTexts, EQUALS_TOKEN, equalsRoles, type EqualsRole } from "./highlightSyntax";

// Blocks whose children are inline content: "==" pairs up within one of them.
const INLINE_CONTAINERS = new Set(["paragraph", "heading", "tableCell"]);
// Inline nodes that have no children of their own but can sit inside a highlight.
const HIGHLIGHTABLE_LEAVES = new Set(["inlineCode", "inlineMath", "aiAlter", "aiAdd"]);

interface Active {
  color: HighlightColor;
  kind: "equals" | "tag";
}

// Where a piece sits in its highlight: only the first piece has a rounded, padded left edge and
// only the last a right one, so a highlight around bold, italic and plain text reads as one
// band instead of one chip per piece.
type Edge = "both" | "start" | "end" | "middle";

function highlightNode(color: HighlightColor, children: any[]) {
  return { type: "aiCustomHighlight", data: { hName: "aiCustomHighlight", hProperties: { color, edge: "both" } }, children };
}

// Turns ==text== and <highlight color="...">text</highlight> into highlighted spans. The content
// of a highlight is ordinary Markdown, so it can hold bold, italic, code, math, AI-added text
// and another highlight (the innermost colour wins), and it can span several pieces of text.
//
// The tags arrive as open/close sentinels (prepareContentForRendering in aiMarkup.ts); "==" is
// found here, in text nodes only, so code and math are never touched. The document is walked in
// reading order with the list of highlights currently open, and every piece of text (or code,
// math, AI-marked text) met meanwhile is wrapped on its own - so a highlight never has to nest
// properly with the bold or italic around it. Runs after remarkNoTest and remarkAiMarkup.
export function remarkHighlight() {
  return (tree: any) => {
    const active: Active[] = [];
    // The latest highlighted piece, to tell whether the next one continues the same highlight.
    let previous: { node: any; entry: Active; start: boolean } | null = null;
    let roles: EqualsRole[][] = [];
    let textIndex = 0;

    const top = () => active[active.length - 1]?.color;

    const setEdge = (piece: { node: any; start: boolean }, end: boolean) => {
      const edge: Edge = piece.start && end ? "both" : piece.start ? "start" : end ? "end" : "middle";
      piece.node.data.hProperties.edge = edge;
    };

    // Wraps a node in a highlight of the innermost open highlight.
    function wrap(node: any) {
      const entry = active[active.length - 1];
      const wrapper = highlightNode(entry.color, [node]);
      const continues = previous !== null && previous.entry === entry;
      if (previous && !continues) setEdge(previous, true);
      previous = { node: wrapper, entry, start: !continues };
      setEdge(previous, false);
      return wrapper;
    }

    function endRun() {
      if (previous) setEdge(previous, true);
      previous = null;
    }

    function close(kind: Active["kind"]) {
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].kind === kind) return void active.splice(i, 1);
      }
    }

    function splitText(value: string, equalsOf: EqualsRole[]): any[] {
      const re = new RegExp(`${HIGHLIGHT_SENTINEL_PATTERN.source}|${EQUALS_TOKEN}`, "g");
      const pieces: any[] = [];
      let equalsIndex = 0;
      let last = 0;
      let match: RegExpExecArray | null;

      const push = (text: string) => {
        if (!text) return;
        const node = { type: "text", value: text };
        pieces.push(top() ? wrap(node) : node);
      };

      while ((match = re.exec(value))) {
        push(value.slice(last, match.index));
        last = re.lastIndex;
        if (match[0] === EQUALS_TOKEN) {
          const role = equalsOf[equalsIndex++];
          if (role === "open") active.push({ color: "blue", kind: "equals" });
          else if (role === "close") close("equals");
          else push(EQUALS_TOKEN);
        } else {
          const color = parseHighlightSentinel(match[0]);
          if (color === "close") close("tag");
          else active.push({ color, kind: "tag" });
        }
      }
      push(value.slice(last));
      return pieces;
    }

    function walk(parent: any) {
      const out: any[] = [];
      for (const child of parent.children as any[]) {
        if (INLINE_CONTAINERS.has(child.type)) {
          endRun();
          roles = equalsRoles(collectTexts(child.children).map((t) => t.value));
          textIndex = 0;
        }

        if (child.type === "text") {
          out.push(...splitText(child.value, roles[textIndex++] ?? []));
        } else if (top() && HIGHLIGHTABLE_LEAVES.has(child.type)) {
          out.push(wrap(child));
        } else if (Array.isArray(child.children)) {
          const hadChildren = child.children.length > 0;
          walk(child);
          // A tag on a line of its own leaves an empty paragraph behind.
          if (child.type === "paragraph" && hadChildren && child.children.length === 0) continue;
          out.push(child);
        } else {
          out.push(child);
        }
      }
      parent.children = out;
    }

    walk(tree);
    endRun();
  };
}
