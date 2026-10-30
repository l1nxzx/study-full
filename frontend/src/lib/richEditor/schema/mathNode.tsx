import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import katex from "katex";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MathAttrs {
  latex: string;
}

function renderKatex(latex: string, displayMode: boolean): string {
  if (!latex.trim()) return "";
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode });
  } catch {
    return "";
  }
}

// Shared click-to-edit NodeView for both math nodes: math is rendered live via KaTeX,
// but typing raw LaTeX into a live-rendering surface is unusable, so clicking swaps the
// rendered view for a plain text input pre-filled with the source, committed on
// Enter/blur - the same pattern Notion/Obsidian use for inline equations. A brand-new
// node (empty latex) opens straight into edit mode.
function MathNodeView({ node, updateAttributes, deleteNode, displayMode }: ReactNodeViewProps & { displayMode: boolean }) {
  const attrs = node.attrs as MathAttrs;
  const [isEditing, setIsEditing] = useState(!attrs.latex);
  const [draft, setDraft] = useState(attrs.latex);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      deleteNode();
      return;
    }
    updateAttributes({ latex: trimmed });
    setIsEditing(false);
  }

  function cancel() {
    setDraft(attrs.latex);
    setIsEditing(false);
    if (!attrs.latex) deleteNode();
  }

  const Wrapper = displayMode ? "div" : "span";

  if (isEditing) {
    const InputTag = displayMode ? "textarea" : "input";
    return (
      <NodeViewWrapper as={Wrapper} className={displayMode ? "my-2 block" : "inline-block align-middle"}>
        <InputTag
          ref={inputRef as never}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (!displayMode || e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          placeholder={displayMode ? "LaTeX, e.g. E = mc^2 (Ctrl+Enter to confirm)" : "LaTeX, e.g. x^2"}
          className={cn(
            "rounded-sm border border-accent bg-canvas px-1.5 py-1 font-mono text-[0.8125rem] text-fg focus:outline-none",
            displayMode ? "block w-full resize-none" : "inline-block"
          )}
        />
      </NodeViewWrapper>
    );
  }

  const html = renderKatex(attrs.latex, displayMode);

  return (
    <NodeViewWrapper
      as={Wrapper}
      className={cn(
        "cursor-pointer rounded-sm transition-colors hover:bg-tint",
        displayMode ? "my-2 block px-2 py-1 text-center" : "inline-block px-0.5"
      )}
      onClick={() => setIsEditing(true)}
      dangerouslySetInnerHTML={html ? { __html: html } : undefined}
    >
      {html ? undefined : <span className="font-sans text-meta text-fg-faint">Click to add an equation</span>}
    </NodeViewWrapper>
  );
}

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex") ?? "",
        renderHTML: (attributes) => ({ "data-latex": attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-math-inline]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-math-inline": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => <MathNodeView {...props} displayMode={false} />);
  },

  addCommands() {
    return {
      insertMathInline:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex: "" } }),
    };
  },
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex") ?? "",
        renderHTML: (attributes) => ({ "data-latex": attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-math-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-math-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => <MathNodeView {...props} displayMode={true} />);
  },

  addCommands() {
    return {
      insertMathBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { latex: "" } }),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathInline: {
      insertMathInline: () => ReturnType;
    };
    mathBlock: {
      insertMathBlock: () => ReturnType;
    };
  }
}
