import { BookOpenText, ChevronDown, ClipboardPen, Eye, MessagesSquare, Pencil, Trash2, Type, Wand2 } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { BackLink, Page } from "@/components/layout/PageHeader";
import { AiReviewBanner } from "@/components/notes/AiReviewBanner";
import { AiRewriteDialog } from "@/components/notes/AiRewriteDialog";
import { AttachmentList } from "@/components/notes/AttachmentList";
import { NoteStatsSection } from "@/components/stats/EntityStats";
import { MarkdownRenderer } from "@/components/notes/MarkdownRenderer";
import { NoteEditor, type NoteEditorValues } from "@/components/notes/NoteEditor";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InlineError } from "@/components/shared/EmptyState";
import { SubjectLabel } from "@/components/shared/SubjectSwatch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton, SkeletonLines } from "@/components/ui/skeleton";
import { useAiPanel } from "@/hooks/useAiPanel";
import { useDeleteNote, useNote, useUpdateNote } from "@/hooks/useNotes";
import { useSubject } from "@/hooks/useSubjects";
import { findAdditions, findAlterations, removeAddition, resolveAlteration, resolveAllAlterations } from "@/lib/aiMarkup";
import { formatDateLong } from "@/lib/date";

// The rich WYSIWYG editor pulls in Tiptap/ProseMirror - lazy-loaded so that bundle only
// ships to users who actually open it, instead of growing the app's main chunk.
const RichNoteEditor = lazy(() => import("@/components/notes/rich-editor/RichNoteEditor"));

function readingMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function NotePageSkeleton() {
  return (
    <Page width="reading">
      <Skeleton className="mb-5 h-3 w-24" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="mt-3 h-3 w-48" />
      <SkeletonLines lines={5} className="mt-12" />
      <SkeletonLines lines={4} className="mt-8" />
    </Page>
  );
}

export function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: note, isLoading } = useNote(id);
  const { data: subject } = useSubject(note?.subjectId ?? undefined);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { setActiveNote, toolMode, setToolMode, isOpen: panelOpen, notesRevealed, toggleNotesRevealed, open: openAiPanel } = useAiPanel();

  const [isEditing, setIsEditing] = useState(false);
  const [isRichEditing, setIsRichEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What you were saving when a save failed: the editor reopens with it, so nothing is lost.
  const [unsaved, setUnsaved] = useState<{ values?: NoteEditorValues; markdown?: string } | null>(null);

  // Registers this note as the AI panel's active context (quick actions + chat become
  // scoped to it) for as long as this page is mounted.
  useEffect(() => {
    if (!note) return;
    setActiveNote({ id: note.id, title: note.title });
    return () => setActiveNote(null);
  }, [note?.id, note?.title, setActiveNote]);

  if (isLoading) return <NotePageSkeleton />;

  if (!note) {
    return <Navigate to="/notes" replace />;
  }

  // Saving shows the changed note at once (the cache is updated before the server answers).
  // If the server refuses, the note goes back and the editor reopens with your changes.
  function handleUpdate(values: NoteEditorValues) {
    setError(null);
    setUnsaved(null);
    setIsEditing(false);
    updateNote.mutate(
      { id: note!.id, input: values },
      {
        onError: (err) => {
          setError(getErrorMessage(err, "Could not save changes"));
          setUnsaved({ values });
          setIsEditing(true);
        },
      }
    );
  }

  function handleDelete() {
    deleteNote.mutate(note!.id);
    navigate(note!.subjectId ? `/subjects/${note!.subjectId}` : "/notes");
  }

  function saveContent(nextContent: string, fromFormatting = false) {
    setError(null);
    updateNote.mutate(
      { id: note!.id, input: { contentMarkdown: nextContent } },
      {
        onError: (err) => {
          setError(getErrorMessage(err, "Could not save changes"));
          if (fromFormatting) {
            setUnsaved({ markdown: nextContent });
            setIsRichEditing(true);
          }
        },
      }
    );
  }

  function openStudyTools() {
    if (toolMode === "quiz") setToolMode("none");
    openAiPanel();
  }

  const alterations = findAlterations(note.contentMarkdown);
  const additions = findAdditions(note.contentMarkdown);
  // Only unresolved corrections block visual formatting; AI-added passages are kept as marked text.
  const hasPendingCorrections = alterations.length > 0;
  const notesHiddenForQuiz = panelOpen && toolMode === "quiz" && !notesRevealed;
  const backTo = subject ? { to: `/subjects/${subject.id}`, label: subject.name } : { to: "/notes", label: "Notes" };

  if (isEditing) {
    return (
      <Page width="wide">
        <NoteEditor
          heading="Editing note"
          initialValues={
            unsaved?.values ?? {
              title: note.title,
              subjectId: note.subjectId ?? "",
              sessionId: note.sessionId,
              date: note.date,
              contentMarkdown: note.contentMarkdown,
            }
          }
          onSubmit={handleUpdate}
          onCancel={() => {
            setUnsaved(null);
            setIsEditing(false);
          }}
          closeOnBack
          isSubmitting={false}
          submitLabel="Save changes"
          error={error}
        />
      </Page>
    );
  }

  if (isRichEditing) {
    return (
      <Page width="wide">
        <Suspense fallback={<SkeletonLines lines={6} className="max-w-[46rem]" />}>
          <RichNoteEditor
            content={unsaved?.markdown ?? note.contentMarkdown}
            isSaving={false}
            onSave={(markdown) => {
              setUnsaved(null);
              saveContent(markdown, true);
              setIsRichEditing(false);
            }}
            onCancel={() => {
              setUnsaved(null);
              setIsRichEditing(false);
            }}
          />
        </Suspense>
      </Page>
    );
  }

  return (
    <Page width="reading">
      <BackLink to={backTo.to} label={backTo.label} />

      <header className="mb-10">
        <h1 className="material-title">{note.title}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-fg-muted">
            {subject && <SubjectLabel name={subject.name} color={subject.color} />}
            {subject && <span aria-hidden className="text-fg-faint">·</span>}
            <span>{formatDateLong(note.date)}</span>
            <span aria-hidden className="text-fg-faint">·</span>
            <span>{readingMinutes(note.contentMarkdown)} min read</span>
          </p>

          <div className="-ml-2.5 flex items-center gap-1 sm:ml-0">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/notes/${note.id}/read`} title="Read as a paper notebook">
                <BookOpenText /> Notebook
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={openStudyTools}>
              <MessagesSquare /> Study with assistant
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Pencil /> Edit <ChevronDown className="!size-3.5 text-fg-faint" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                  <Pencil /> Edit Markdown and details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsRichEditing(true)} disabled={hasPendingCorrections}>
                  <Type />
                  <span className="flex-1">
                    Format visually
                    {hasPendingCorrections && <span className="block text-meta text-fg-faint">Accept or reject the AI corrections first</span>}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRewriteOpen(true)}>
                  <Wand2 /> Rewrite with AI
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate(`/tests/new?noteIds=${note.id}`)}>
                  <ClipboardPen /> Make a test from it
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 /> Delete note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <InlineError className="mb-6">{error}</InlineError>

      <AiReviewBanner
        alterationCount={alterations.length}
        additionCount={additions.length}
        isSaving={updateNote.isPending}
        onAcceptAll={() => saveContent(resolveAllAlterations(note.contentMarkdown, "accept"))}
        onRejectAll={() => saveContent(resolveAllAlterations(note.contentMarkdown, "reject"))}
      />

      <article className="relative">
        <MarkdownRenderer
          content={note.contentMarkdown}
          onResolveAlteration={(index, action, manualText) => saveContent(resolveAlteration(note.contentMarkdown, index, action, manualText))}
          onRemoveAddition={(index) => saveContent(removeAddition(note.contentMarkdown, index))}
        />

        {notesHiddenForQuiz && (
          <div className="absolute inset-0 -mx-3 flex min-h-64 items-start justify-center bg-canvas px-3 pt-16">
            <div className="max-w-xs text-center">
              <p className="text-sm font-medium text-fg">The note is hidden while you practise</p>
              <p className="mt-1 text-[0.8125rem] text-fg-muted">So the answers come from memory, not from reading them off the page.</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={toggleNotesRevealed}>
                <Eye /> Show the note
              </Button>
            </div>
          </div>
        )}
      </article>

      <div className="mt-16 space-y-14">
        <AttachmentList noteId={note.id} attachments={note.attachments} />
        <NoteStatsSection noteId={note.id} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this note?"
        description="The note and its source files will be permanently deleted."
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
    </Page>
  );
}
