import { NO_TEST_OPEN_SENTINEL, NO_TEST_SENTINEL_PATTERN, NO_TEST_TITLE } from "./aiMarkup";

const INLINE_LEAVES = new Set(["inlineCode", "inlineMath"]);
const BLOCK_LEAVES = new Set(["code", "math"]);

function inlineWrapper(children: any[]) {
  return {
    type: "noTest",
    data: { hName: "span", hProperties: { className: ["study-untested"], title: NO_TEST_TITLE } },
    children,
  };
}

function blockWrapper(children: any[]) {
  return {
    type: "noTestBlock",
    data: { hName: "div", hProperties: { className: ["study-untested-block"], title: NO_TEST_TITLE } },
    children,
  };
}

// Finds the sentinels prepareContentForRendering() (in aiMarkup.ts) left in place of the
// <notest> and </notest> tags and marks everything between them as "not examined". A region
// can start in one paragraph and end in another (or cover whole headings, lists and tables),
// so this walks the document in reading order, remembering whether it is inside a region,
// and wraps each piece of text it passes. Must run before the plugins that split text nodes
// further (remarkAiMarkup, remarkHighlightMark): they then work inside the wrappers.
export function remarkNoTest() {
  return (tree: any) => {
    let inside = false;

    function walk(parent: any) {
      const out: any[] = [];
      for (const child of parent.children as any[]) {
        if (child.type === "text") {
          const value: string = child.value;
          const re = new RegExp(NO_TEST_SENTINEL_PATTERN.source, "g");
          let lastEnd = 0;
          let match: RegExpExecArray | null;
          const push = (text: string) => {
            if (!text) return;
            const node = { type: "text", value: text };
            out.push(inside && text.trim() ? inlineWrapper([node]) : node);
          };
          while ((match = re.exec(value))) {
            push(value.slice(lastEnd, match.index));
            inside = match[0] === NO_TEST_OPEN_SENTINEL;
            lastEnd = re.lastIndex;
          }
          push(value.slice(lastEnd));
        } else if (inside && INLINE_LEAVES.has(child.type)) {
          out.push(inlineWrapper([child]));
        } else if (inside && BLOCK_LEAVES.has(child.type)) {
          out.push(blockWrapper([child]));
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
  };
}
