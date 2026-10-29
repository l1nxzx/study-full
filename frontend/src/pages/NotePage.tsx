import { ArrowLeft, Eye, Pencil, Sparkles, Trash2, Type, Wand2 } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { AiReviewBanner } from "@/components/notes/AiReviewBanner";
import { AiRewriteDialog } from "@/components/notes/AiRewriteDialog";
import { AttachmentList } from "@/components/notes/AttachmentList";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import { NoteEditor, type NoteEditorValues } from "@/components/notes/NoteEditor";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SubjectBadge } from "@/components/shared/SubjectBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiPanel } from "@/hooks/useAiPanel";
import { useDeleteNote, useNote, useUpdateNote } from "@/hooks/useNotes";
import { useSubject } from "@/hooks/useSubjects";
import { findAdditions, findAlterations, removeAddition, resolveAlteration, resolveAllAlterations } from "@/lib/aiMarkup";
import { formatDateLong } from "@/lib/date";

// The rich WYSIWYG editor pulls in Tiptap/ProseMirror - lazy-loaded so that bundle only
// ships to users who actually open it, instead of growing the app's main chunk.
const RichNoteEditor = lazy(() => import("@/components/notes/rich-editor/RichNoteEditor"));

export function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: note, isLoading } = useNote(id);
  const { data: subject } = useSubject(note?.subjectId);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { setActiveNote, toolMode, notesRevealed, toggleNotesRevealed, open: openAiPanel } = useAiPanel();

  const [isEditing, setIsEditing] = useState(false);
  const [isRichEditing, setIsRichEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registers this note as the AI panel's active context (quick actions + chat become
  // scoped to it) for as long as this page is mounted.
  useEffect(() => {
    if (!note) return;
    setActiveNote({ id: note.id, title: note.title });
    return () => setActiveNote(null);
  }, [note?.id, note?.title, setActiveNote]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!note) {
    return <Navigate to="/notes" replace />;
  }

  async function handleUpdate(values: NoteEditorValues) {
    setError(null);
    try {
      await updateNote.mutateAsync({ id: note!.id, input: values });
      setIsEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save changes"));
    }
  }

  async function handleDelete() {
    await deleteNote.mutateAsync(note!.id);
    navigate(note!.subjectId ? `/subjects/${note!.subjectId}` : "/notes");
  }

  function saveContent(nextContent: string) {
    updateNote.mutate({ id: note!.id, input: { contentMarkdown: nextContent } });
  }

  const alterations = findAlterations(note.contentMarkdown);
  const additions = findAdditions(note.contentMarkdown);
  const hasPendingReview = alterations.length + additions.length > 0;
  const notesHiddenForQuiz = (toolMode === "quiz" || toolMode === "practice") && !notesRevealed;

  return (
    <div>
      <Link to={subject ? `/subjects/${subject.id}` : "/notes"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        {subject?.name || "Notes"}
      </Link>

      {isEditing ? (
        <>
          <h1 className="mb-4 text-2xl font-semibold tracking-tight">Edit note</h1>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <NoteEditor
            initialValues={{
              title: note.title,
              subjectId: note.subjectId,
              sessionId: note.sessionId,
              date: note.date,
              contentMarkdown: note.contentMarkdown,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSubmitting={updateNote.isPending}
          />
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{note.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {subject && <SubjectBadge name={subject.name} color={subject.color} />}
                <span>{formatDateLong(note.date)}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={openAiPanel}>
                <Sparkles /> AI tools
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRewriteOpen(true)}>
                <Wand2 /> AI rewrite
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRichEditing(true)}
                disabled={hasPendingReview}
                title={hasPendingReview ? "Resolve the pending AI corrections below first" : undefined}
              >
                <Type /> Format
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Delete
              </Button>
            </div>
          </div>

          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          <AiReviewBanner
            alterationCount={alterations.length}
            additionCount={additions.length}
            isSaving={updateNote.isPending}
            onAcceptAll={() => saveContent(resolveAllAlterations(note.contentMarkdown, "accept"))}
            onRejectAll={() => saveContent(resolveAllAlterations(note.contentMarkdown, "reject"))}
          />

          {isRichEditing ? (
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <RichNoteEditor
                content={note.contentMarkdown}
                isSaving={updateNote.isPending}
                onSave={(markdown) => {
                  saveContent(markdown);
                  setIsRichEditing(false);
                }}
                onCancel={() => setIsRichEditing(false)}
              />
            </Suspense>
          ) : (
            <div className="relative rounded-xl border border-border bg-card p-6">
              <MarkdownRenderer
                content={note.contentMarkdown}
                onResolveAlteration={(index, action, manualText) =>
                  saveContent(resolveAlteration(note.contentMarkdown, index, action, manualText))
                }
                onRemoveAddition={(index) => saveContent(removeAddition(note.contentMarkdown, index))}
              />

              {notesHiddenForQuiz && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-card/95 backdrop-blur-sm">
                  <p className="text-sm font-medium text-muted-foreground">Notes hidden while quizzing</p>
                  <Button size="sm" variant="outline" onClick={toggleNotesRevealed}>
                    <Eye /> Show notes
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <AttachmentList noteId={note.id} attachments={note.attachments} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this note?"
        description="This will permanently delete the note and its attachments."
        confirmLabel="Delete note"
        isLoading={deleteNote.isPending}
        onConfirm={handleDelete}
      />

      <AiRewriteDialog
        open={rewriteOpen}
        onOpenChange={setRewriteOpen}
        noteId={note.id}
        contentMarkdown={note.contentMarkdown}
        onApply={saveContent}
      />
    </div>
  );
}
