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
  Table as TableIcon,
  Undo2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CALLOUT_VARIANT_CONFIG, CALLOUT_VARIANTS } from "@/lib/calloutVariants";
import { HIGHLIGHT_COLOR_CLASSES, HIGHLIGHT_COLORS } from "@/lib/highlightColors";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor;
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
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
      <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

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

      <div className="mx-1 h-5 w-px bg-border" />

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

      <div className="mx-1 h-5 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Callout"
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("callout") && "bg-accent text-accent-foreground"
            )}
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
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("highlight") && "bg-accent text-accent-foreground"
            )}
          >
            <Highlighter className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="flex w-auto gap-1 p-1.5">
          {HIGHLIGHT_COLORS.map((color) => (
            <DropdownMenuItem key={color} asChild onSelect={() => editor.chain().focus().setHighlight(color).run()}>
              <button
                type="button"
                title={color}
                onMouseDown={(e) => e.preventDefault()}
                className={cn("size-6 rounded-full p-0 ring-offset-2 ring-offset-card", HIGHLIGHT_COLOR_CLASSES[color])}
              />
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem asChild onSelect={() => editor.chain().focus().unsetHighlight().run()}>
            <button
              type="button"
              title="Remove highlight"
              onMouseDown={(e) => e.preventDefault()}
              className="flex size-6 items-center justify-center rounded-full border border-border p-0 text-[10px] text-muted-foreground"
            >
              ×
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton title="Insert inline math" onClick={() => editor.chain().focus().insertMathInline().run()}>
        <Sigma className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Insert equation block" onClick={() => editor.chain().focus().insertMathBlock().run()}>
        <span className="text-xs font-semibold">∑=</span>
      </ToolbarButton>
      <ToolbarButton
        title="Insert table"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon className="size-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" />
      </ToolbarButton>
    </div>
  );
}
