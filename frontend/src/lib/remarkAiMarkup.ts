import { visit } from "unist-util-visit";
import { SENTINEL_PATTERN } from "./aiMarkup";

// Finds the sentinels prepareContentForRendering() (in aiMarkup.ts) left behind in
// place of <aialter>/<aiadd> tags and turns each one into its own <aiAlter>/<aiAdd>
// AST node (carrying only an index - the actual text lives in the alterations/
// additions arrays MarkdownRenderer already has, looked up by that index at render
// time). Sentinels are plain characters, so by this point they're guaranteed to be
// sitting inside ordinary mdast "text" nodes - no HTML parsing involved anywhere.
export function remarkAiMarkup() {
  return (tree: any) => {
    visit(tree, "text", (node: any, index: number | undefined, parent: any) => {
      if (!parent || index === undefined) return;
      const value: string = node.value;

      const re = new RegExp(SENTINEL_PATTERN.source, "g");
      if (!re.test(value)) return;
      re.lastIndex = 0;

      const replacement: any[] = [];
      let lastEnd = 0;
      let match: RegExpExecArray | null;

      while ((match = re.exec(value))) {
        if (match.index > lastEnd) {
          replacement.push({ type: "text", value: value.slice(lastEnd, match.index) });
        }

        const kind = match[1];
        const itemIndex = Number(match[2]);
        const hName = kind === "A" ? "aiAlter" : kind === "D" ? "aiAdd" : "aiCustomHighlight";
        replacement.push({
          type: hName,
          data: { hName, hProperties: { index: itemIndex } },
          children: [],
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
