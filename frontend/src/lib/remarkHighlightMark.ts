import { visit } from "unist-util-visit";

export const MARK_PATTERN = /==(.+?)==/g;

// Turns ==highlighted text== into a real <mark> element. Unlike the <aialter>/<aiadd>
// tags, "==" has no special meaning to CommonMark, so this can run as a normal text-node
// pass with no sentinel workaround needed.
export function remarkHighlightMark() {
  return (tree: any) => {
    visit(tree, "text", (node: any, index: number | undefined, parent: any) => {
      if (!parent || index === undefined) return;
      const value: string = node.value;

      const re = new RegExp(MARK_PATTERN.source, "g");
      if (!re.test(value)) return;
      re.lastIndex = 0;

      const replacement: any[] = [];
      let lastEnd = 0;
      let match: RegExpExecArray | null;

      while ((match = re.exec(value))) {
        if (match.index > lastEnd) {
          replacement.push({ type: "text", value: value.slice(lastEnd, match.index) });
        }
        replacement.push({
          type: "highlightMark",
          data: { hName: "mark" },
          children: [{ type: "text", value: match[1] }],
        });
        lastEnd = re.lastIndex;
      }

      if (lastEnd < value.length) {
        replacement.push({ type: "text", value: value.slice(lastEnd) });
      }

      parent.children.splice(index, 1, ...replacement);
      return index + replacement.length;
    });
  };
}
