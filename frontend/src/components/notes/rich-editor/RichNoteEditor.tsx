import { EditorContent, useEditor } from "@tiptap/react";
import { useMemo, useState } from "react";
import { EditorToolbar } from "@/components/notes/rich-editor/EditorToolbar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { usePauseRefresh } from "@/hooks/usePauseRefresh";
import { useCloseOnBack } from "@/lib/closeOnBack";
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
//
// The note keeps its reading typography while being formatted; only the toolbar, pinned to
// the top of the page, says you're editing.
function RichNoteEditor({ content, onSave, onCancel, isSaving }: RichNoteEditorProps) {
  const extensions = useMemo(() => buildRichEditorExtensions(), []);
  const initialDoc = useMemo(() => markdownToTiptap(content), [content]);
  const [dirty, setDirty] = useState(false);
  usePauseRefresh();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Formatting is a mode of the note page: the system Back leaves it like Cancel, but asks
  // first when there are unsaved changes.
  useCloseOnBack(true, () => {
    if (!dirty) return void onCancel();
    setConfirmDiscard(true);
    return false;
  });

  const editor = useEditor({
    extensions,
    content: initialDoc,
    onUpdate: () => setDirty(true),
    // The toolbar shows which formats apply at the cursor, so it follows every selection change.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: cn(PROSE_CLASSES, "min-h-[50vh] py-2 focus:outline-none"),
      },
    },
  });

  function handleSave() {
    if (!editor) return;
    onSave(tiptapToMarkdown(editor.getJSON()));
  }

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-5 -mt-6 border-b border-rule bg-canvas sm:-mx-8 lg:-mx-12 lg:-mt-11">
        <div className="flex items-center gap-3 px-5 pb-1 pt-3 sm:px-8 lg:px-12">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg-muted">Formatting this note</p>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !editor}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
        {editor && <EditorToolbar editor={editor} />}
      </div>
      <div className="max-w-[46rem] pt-8">
        <EditorContent editor={editor} />
      </div>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard your changes?"
        description="Your edits to this note haven't been saved."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmDiscard(false);
          onCancel();
        }}
      />

    </div>
  );
}

export default RichNoteEditor;
