import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Megaphone,
  Minus,
  Quote,
  Redo2,
  Sigma,
  SquareSigma,
  Table as TableIcon,
  Undo2,
  X,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CALLOUT_VARIANT_CONFIG, CALLOUT_VARIANTS } from "@/lib/calloutVariants";
import { HIGHLIGHT_COLOR_CLASSES, HIGHLIGHT_COLORS } from "@/lib/highlightColors";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor;
}

// Menu items tint on hover; a colour swatch must keep its own colour instead.
const SWATCH_KEEP_COLOR: Record<(typeof HIGHLIGHT_COLORS)[number], string> = {
  yellow: "data-[highlighted]:bg-highlight-yellow",
  blue: "data-[highlighted]:bg-highlight-blue",
  green: "data-[highlighted]:bg-highlight-green",
  red: "data-[highlighted]:bg-highlight-red",
  purple: "data-[highlighted]:bg-highlight-purple",
  orange: "data-[highlighted]:bg-highlight-orange",
};

const toolbarButtonClasses = (active?: boolean) =>
  cn(
    "flex size-9 shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-tint hover:text-fg sm:size-8",
    active && "bg-accent/12 text-accent hover:bg-accent/15 hover:text-accent"
  );

function Divider() {
  return <div aria-hidden className="mx-1 h-5 w-px shrink-0 bg-rule" />;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={title}
      aria-pressed={active}
      className={toolbarButtonClasses(active)}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex items-center gap-0.5 overflow-x-auto px-4 pb-2 pt-1 sm:px-7 lg:px-11 [scrollbar-width:none]"
    >
      <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="size-4" />
      </ToolbarButton>

      <Divider />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Callout"
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Callout"
            className={toolbarButtonClasses(editor.isActive("callout"))}
          >
            <Megaphone className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {CALLOUT_VARIANTS.map((variant) => {
            const config = CALLOUT_VARIANT_CONFIG[variant];
            return (
              <DropdownMenuItem key={variant} onSelect={() => editor.chain().focus().setCallout(variant).run()}>
                <config.icon className={cn("size-3.5", config.iconClasses)} />
                {config.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Highlight"
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Highlight"
            className={toolbarButtonClasses(editor.isActive("highlight"))}
          >
            <Highlighter className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="flex w-auto min-w-0 gap-1 p-1.5">
          {HIGHLIGHT_COLORS.map((color) => (
            <DropdownMenuItem
              key={color}
              title={color}
              aria-label={`Highlight ${color}`}
              onMouseDown={(e) => e.preventDefault()}
              onSelect={() => editor.chain().focus().setHighlight(color).run()}
              className={cn(
                "size-7 min-h-0 rounded-sm p-0 sm:min-h-0 data-[highlighted]:outline data-[highlighted]:outline-2 data-[highlighted]:outline-offset-1 data-[highlighted]:outline-fg-muted",
                HIGHLIGHT_COLOR_CLASSES[color],
                SWATCH_KEEP_COLOR[color]
              )}
            />
          ))}
          <DropdownMenuItem
            title="Remove highlight"
            aria-label="Remove highlight"
            onMouseDown={(e) => e.preventDefault()}
            onSelect={() => editor.chain().focus().unsetHighlight().run()}
            className="size-7 min-h-0 justify-center rounded-sm border border-rule-strong p-0 sm:min-h-0"
          >
            <X className="size-3.5" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      <ToolbarButton title="Insert inline math" onClick={() => editor.chain().focus().insertMathInline().run()}>
        <Sigma className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Insert equation block" onClick={() => editor.chain().focus().insertMathBlock().run()}>
        <SquareSigma className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Insert table"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" />
      </ToolbarButton>
    </div>
  );
}
