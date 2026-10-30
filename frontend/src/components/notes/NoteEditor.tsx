import { useLayoutEffect, useRef, useState } from "react";
import type { NoteInput } from "@/api/notes";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useSubjects } from "@/hooks/useSubjects";
import { useCloseOnBack } from "@/lib/closeOnBack";
import { formatDateLong } from "@/lib/date";
import { cn } from "@/lib/utils";
import { CopyPromptButton } from "./CopyPromptButton";
import { MarkdownRenderer } from "./MarkdownRenderer";

export interface NoteEditorValues extends NoteInput {}

interface NoteEditorProps {
  heading: string;
  initialValues: NoteEditorValues;
  onSubmit: (values: NoteEditorValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  error?: string | null;
  /** The editor is a mode of a page: the system Back closes it (asking about unsaved changes). */
  closeOnBack?: boolean;
}

type ViewMode = "write" | "split" | "preview";

// Writing a note is mostly pasting Markdown that ChatGPT or Claude produced from photos or
// PDFs of handwritten notes, then checking it. So: a large title, the few details that file
// the note, and a big Markdown field with a live preview beside it on wide screens. The save
// bar stays pinned to the top while scrolling a long note.
export function NoteEditor({ heading, initialValues, onSubmit, onCancel, isSubmitting, submitLabel = "Save", error, closeOnBack }: NoteEditorProps) {
  const [values, setValues] = useState<NoteEditorValues>(initialValues);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  // Editing inside a page (closeOnBack): the system Back leaves the editor like Cancel, but asks
  // first when there are unsaved changes.
  useCloseOnBack(Boolean(closeOnBack && onCancel), () => {
    if (!dirty) return void onCancel?.();
    setConfirmDiscard(true);
    return false;
  });
  const [view, setView] = useState<ViewMode>(() => (window.matchMedia("(min-width: 1200px)").matches ? "split" : "write"));
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const { data: subjects } = useSubjects();
  const { data: sessions } = useClassSessions(values.subjectId ? { subjectId: values.subjectId } : {});
  const selectedSubjectName = subjects?.find((s) => s.id === values.subjectId)?.name;

  // The title field wraps like a heading; grow it to fit instead of scrolling.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [values.title]);

  const canSubmit = values.title.trim().length > 0 && values.subjectId && values.date;
  const missing = !values.title.trim() ? "Add a title to save." : !values.subjectId ? "Choose a subject to save." : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(values);
      }}
    >
      <div className="sticky top-0 z-20 -mx-5 -mt-6 mb-8 flex items-center gap-3 border-b border-rule bg-canvas px-5 py-3 sm:-mx-8 sm:px-8 lg:-mx-12 lg:-mt-11 lg:px-12">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg-muted">{heading}</p>
        {error ? (
          <p role="alert" className="hidden truncate text-[0.8125rem] text-bad sm:block">
            {error}
          </p>
        ) : (
          missing && <p className="hidden text-[0.8125rem] text-fg-faint md:block">{missing}</p>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
      {error && (
        <p role="alert" className="-mt-4 mb-6 text-sm text-bad sm:hidden">
          {error}
        </p>
      )}

      <div className="max-w-[46rem]">
        <label htmlFor="note-title" className="sr-only">
          Title
        </label>
        <textarea
          id="note-title"
          rows={1}
          placeholder="Untitled note"
          value={values.title}
          ref={titleRef}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value.replace(/\n/g, " ") }))}
          required
          className="material-title block w-full resize-none overflow-hidden bg-transparent placeholder:text-fg-faint/70 focus:outline-none"
        />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Subject">
            <Select value={values.subjectId || undefined} onValueChange={(subjectId) => setValues((v) => ({ ...v, subjectId, sessionId: null }))}>
              <SelectTrigger aria-label="Subject">
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Date" htmlFor="note-date">
            <Input id="note-date" type="date" value={values.date} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} required />
          </Field>

          <Field label="Class session">
            <Select
              value={values.sessionId || "none"}
              onValueChange={(sessionId) => setValues((v) => ({ ...v, sessionId: sessionId === "none" ? null : sessionId }))}
              disabled={!values.subjectId}
            >
              <SelectTrigger aria-label="Class session">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {sessions?.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.title || formatDateLong(session.date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Segmented
            label="Editor view"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "write", label: "Markdown" },
              { value: "split", label: "Side by side" },
              { value: "preview", label: "Preview" },
            ]}
            className="[&>button:nth-child(2)]:hidden @4xl:[&>button:nth-child(2)]:block"
          />
          <CopyPromptButton subjectName={selectedSubjectName} className="-mr-2" />
        </div>

        {!values.contentMarkdown.trim() && view !== "preview" && (
          <p className="mb-3 max-w-[46rem] text-[0.8125rem] leading-relaxed text-fg-faint">
            Paste the Markdown from ChatGPT or Claude here. To convert photos or PDFs of handwritten notes, copy the conversion prompt
            and give it to them together with your files.
          </p>
        )}

        <div className={cn("grid gap-4", view === "split" ? "@4xl:grid-cols-2" : "grid-cols-1", view !== "split" && "max-w-[46rem]")}>
          {view !== "preview" && (
            <textarea
              aria-label="Note content (Markdown)"
              placeholder="## Heading&#10;&#10;Your notes in Markdown..."
              value={values.contentMarkdown}
              onChange={(e) => setValues((v) => ({ ...v, contentMarkdown: e.target.value }))}
              spellCheck
              className="min-h-[60vh] w-full resize-y rounded-md border border-rule-strong bg-panel px-4 py-3.5 font-mono text-[0.8125rem] leading-[1.7] text-fg transition-colors placeholder:text-fg-faint hover:border-fg-faint/60 focus-visible:border-accent focus-visible:outline-none"
            />
          )}
          {view !== "write" && (
            <div className={cn("min-h-[60vh] rounded-md border border-rule px-5 py-4 sm:px-7 sm:py-6", view === "split" && "@4xl:max-h-[75vh] @4xl:overflow-y-auto")}>
              <MarkdownRenderer content={values.contentMarkdown} emptyLabel="Nothing to preview yet." />
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard your changes?"
        description="Your edits to this note haven't been saved."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmDiscard(false);
          onCancel?.();
        }}
      />
    </form>
  );
}
