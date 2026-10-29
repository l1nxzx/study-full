import { visit } from "unist-util-visit";

export const CALLOUT_TYPES = new Set(["note", "tip", "important", "warning"]);
export const CALLOUT_PATTERN = /^\[!(note|tip|important|warning)\]\s*/i;

// GitHub-style alert syntax: a blockquote whose first line is "[!NOTE]" / "[!TIP]" /
// "[!IMPORTANT]" / "[!WARNING]" renders as a colored callout box instead of a plain
// blockquote. This is a well-known convention, so AI-generated content tends to produce
// it reliably when asked to.
export function remarkCallouts() {
  return (tree: any) => {
    visit(tree, "blockquote", (node: any) => {
      const firstParagraph = node.children?.[0];
      if (!firstParagraph || firstParagraph.type !== "paragraph") return;

      const firstText = firstParagraph.children?.[0];
      if (!firstText || firstText.type !== "text") return;

      const match = CALLOUT_PATTERN.exec(firstText.value);
      if (!match) return;

      const variant = match[1].toLowerCase();
      if (!CALLOUT_TYPES.has(variant)) return;

      firstText.value = firstText.value.slice(match[0].length);
      if (!firstText.value && firstParagraph.children.length === 1) {
        node.children.shift();
      }

      node.data = { ...(node.data || {}), hName: "aiCallout", hProperties: { variant } };
    });
  };
}
