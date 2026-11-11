import { parseReviewSentinel, REVIEW_SENTINEL_PATTERN, type ReviewKind } from "./aiMarkup";

interface Frame {
  kind: ReviewKind | null;
  index: number;
  children: any[];
}

// Finds the sentinels prepareContentForRendering() (in aiMarkup.ts) left behind in place of
// <aialter>/<aiadd> tags and wraps everything between an opening and its closing sentinel in an
// <aiAlter>/<aiAdd> node (carrying only the number of the tag - the original text of a correction
// lives in the alterations array MarkdownRenderer already has, looked up by that number).
//
// What is inside a tag is ordinary Markdown, so the wrapped nodes can be bold, italic, code, math
// or highlights. The two sentinels have to end up in the same parent (the same paragraph, or the
// same piece of bold text); a tag whose ends are not, for instance one that starts in a paragraph
// and ends in the next, is dropped and its text shown as it is.
export function remarkAiMarkup() {
  return (tree: any) => {
    function process(parent: any) {
      for (const child of parent.children as any[]) {
        if (Array.isArray(child.children)) process(child);
      }

      const frames: Frame[] = [{ kind: null, index: -1, children: [] }];
      let found = false;
      const add = (node: any) => frames[frames.length - 1].children.push(node);

      for (const child of parent.children as any[]) {
        if (child.type !== "text") {
          add(child);
          continue;
        }

        const re = new RegExp(REVIEW_SENTINEL_PATTERN.source, "g");
        const value: string = child.value;
        let last = 0;
        let match: RegExpExecArray | null;
        while ((match = re.exec(value))) {
          found = true;
          if (match.index > last) add({ type: "text", value: value.slice(last, match.index) });
          last = re.lastIndex;

          const { kind, open, index } = parseReviewSentinel(match[0]);
          if (open) {
            frames.push({ kind, index, children: [] });
            continue;
          }
          // Close the nearest open tag of that kind; tags opened after it never closed, so they
          // dissolve into their parent.
          let at = frames.length - 1;
          while (at > 0 && frames[at].kind !== kind) at--;
          if (at === 0) continue;
          while (frames.length - 1 > at) {
            const dropped = frames.pop()!;
            frames[frames.length - 1].children.push(...dropped.children);
          }
          const frame = frames.pop()!;
          const hName = kind === "A" ? "aiAlter" : "aiAdd";
          add({ type: hName, data: { hName, hProperties: { index: frame.index } }, children: frame.children });
        }
        if (last < value.length) add({ type: "text", value: value.slice(last) });
      }

      if (!found) return;
      while (frames.length > 1) {
        const dropped = frames.pop()!;
        frames[frames.length - 1].children.push(...dropped.children);
      }
      parent.children = frames[0].children;
    }

    process(tree);
  };
}
