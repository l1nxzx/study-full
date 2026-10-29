import { EditorContent, useEditor } from "@tiptap/react";
import { Check, X } from "lucide-react";
import { useMemo } from "react";
import { EditorToolbar } from "@/components/notes/rich-editor/EditorToolbar";
import { Button } from "@/components/ui/button";
import { buildRichEditorExtensions } from "@/lib/richEditor/extensions";
import { markdownToTiptap } from "@/lib/richEditor/markdownToTiptap";
import { tiptapToMarkdown } from "@/lib/richEditor/tiptapToMarkdown";
import { PROSE_CLASSES } from "@/lib/proseClasses";
import { cn } from "@/lib/utils";

interface RichNoteEditorProps {
  content: string;
  onSave: (markdown: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

// A true WYSIWYG surface for editing just a note's content (title/subject/date stay in
// the existing NoteEditor's raw-text "Edit" flow) - converts this app's Markdown into a
// Tiptap document on open and back on Save. See lib/richEditor/ for the bidirectional
// conversion and the custom callout/highlight/math node types.
function RichNoteEditor({ content, onSave, onCancel, isSaving }: RichNoteEditorProps) {
  const extensions = useMemo(() => buildRichEditorExtensions(), []);
  const initialDoc = useMemo(() => markdownToTiptap(content), [content]);

  const editor = useEditor({
    extensions,
    content: initialDoc,
    editorProps: {
      attributes: {
        class: cn(PROSE_CLASSES, "min-h-[320px] px-4 py-4 focus:outline-none"),
      },
    },
  });

  function handleSave() {
    if (!editor) return;
    onSave(tiptapToMarkdown(editor.getJSON()));
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-medium text-foreground">Format note</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !editor}>
            <Check /> {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichNoteEditor;
