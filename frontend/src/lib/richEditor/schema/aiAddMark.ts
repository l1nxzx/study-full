import { Mark, mergeAttributes } from "@tiptap/core";

// Text the AI added during transcription (<aiadd>...</aiadd>). It stays marked while you
// format the note, so it survives a visual edit and is still distinguishable from your own
// writing afterwards, and it takes any other formatting (bold, highlight, code...) like normal
// text. Not inclusive: typing at its edge writes plain text, not more "AI" text.
export const AiAddMark = Mark.create({
  name: "aiAdd",
  inclusive: false,

  parseHTML() {
    return [{ tag: "span[data-ai-add]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-ai-add": "",
        title: "Added by the AI, not in the original notes",
        class: "underline decoration-accent/60 decoration-dashed underline-offset-4",
      }),
      0,
    ];
  },
});
