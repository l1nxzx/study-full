import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import { NO_TEST_TITLE } from "@/lib/aiMarkup";

// Blocks that can't carry marks (their content isn't formatted text) are flagged with an
// attribute instead, so a selection that covers them leaves them out of tests as well.
export const NO_TEST_BLOCK_TYPES = ["mathBlock", "codeBlock"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    noTest: {
      /** Marks the selection as left out of quizzes and tests, or clears that when all of it already is. */
      toggleNoTest: () => ReturnType;
    };
  }
}

// Text the student keeps in the note but won't be examined on (<notest>...</notest>): it is
// left out of quizzes, flashcards and tests. Not inclusive: typing at its edge writes ordinary
// text. See tiptapToMarkdown.ts for how it is written back.
export const NoTestMark = Mark.create({
  name: "noTest",
  inclusive: false,

  parseHTML() {
    return [{ tag: "span[data-no-test]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-no-test": "", title: NO_TEST_TITLE, class: "study-untested" }), 0];
  },

  addCommands() {
    return {
      toggleNoTest:
        () =>
        ({ state, tr, dispatch, editor }) => {
          const { from, to, empty } = state.selection;
          if (empty) return false;
          const markType = state.schema.marks[this.name];

          const blocks: { pos: number; flagged: boolean }[] = [];
          let hasInline = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (NO_TEST_BLOCK_TYPES.includes(node.type.name)) {
              blocks.push({ pos, flagged: Boolean(node.attrs.noTest) });
              return false;
            }
            if (node.isInline) hasInline = true;
            return true;
          });

          const inlineMarked = hasInline && editor.isActive(this.name);
          const allMarked = (hasInline || blocks.length > 0) && (!hasInline || inlineMarked) && blocks.every((b) => b.flagged);
          const value = !allMarked;

          if (dispatch) {
            if (value) tr.addMark(from, to, markType.create());
            else tr.removeMark(from, to, markType);
            for (const block of blocks) tr.setNodeAttribute(block.pos, "noTest", value);
          }
          return true;
        },
    };
  },
});

export const NoTestBlockAttribute = Extension.create({
  name: "noTestBlockAttribute",

  addGlobalAttributes() {
    return [
      {
        types: NO_TEST_BLOCK_TYPES,
        attributes: {
          noTest: {
            default: false,
            parseHTML: (element) => element.hasAttribute("data-no-test"),
            renderHTML: (attributes) => (attributes.noTest ? { "data-no-test": "", title: NO_TEST_TITLE } : {}),
          },
        },
      },
    ];
  },
});
