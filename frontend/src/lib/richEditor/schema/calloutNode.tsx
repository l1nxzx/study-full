import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { CALLOUT_VARIANT_CONFIG, resolveCalloutVariant, type CalloutVariant } from "@/lib/calloutVariants";
import { cn } from "@/lib/utils";

export interface CalloutNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    calloutNode: {
      setCallout: (variant: CalloutVariant) => ReturnType;
    };
  }
}

function CalloutNodeView({ node, updateAttributes }: ReactNodeViewProps) {
  const variant = resolveCalloutVariant(node.attrs.variant);
  const config = CALLOUT_VARIANT_CONFIG[variant];

  return (
    <NodeViewWrapper className={cn("my-4 rounded-lg border px-4 py-3", config.classes)} data-callout={variant}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", config.iconClasses)}>
          <config.icon className="size-3.5" />
          {config.label}
        </div>
        <select
          contentEditable={false}
          value={variant}
          onChange={(e) => updateAttributes({ variant: e.target.value })}
          className="rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground"
        >
          {Object.entries(CALLOUT_VARIANT_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>
      <NodeViewContent className="text-sm text-foreground [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0" />
    </NodeViewWrapper>
  );
}

// A [!NOTE]/[!TIP]/[!IMPORTANT]/[!WARNING] callout blockquote, edited as a real WYSIWYG
// block with a variant switcher - see tiptapToMarkdown.ts for how it serializes back to
// the app's "> [!VARIANT]\n> ..." blockquote syntax.
export const CalloutNode = Node.create<CalloutNodeOptions>({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      variant: {
        default: "note" as CalloutVariant,
        parseHTML: (element) => resolveCalloutVariant(element.getAttribute("data-callout")),
        renderHTML: (attributes) => ({ "data-callout": attributes.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addCommands() {
    return {
      setCallout:
        (variant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
    };
  },
});
