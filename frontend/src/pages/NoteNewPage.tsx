import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NoteEditor, type NoteEditorValues } from "@/components/notes/NoteEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { getErrorMessage } from "@/api/client";
import { useCreateNote } from "@/hooks/useNotes";
import { todayISO } from "@/lib/date";

export function NoteNewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const createNote = useCreateNote();
  const [error, setError] = useState<string | null>(null);

  const initialValues: NoteEditorValues = {
    title: "",
    subjectId: searchParams.get("subjectId") || "",
    sessionId: searchParams.get("sessionId") || null,
    date: searchParams.get("date") || todayISO(),
    contentMarkdown: "",
  };

  async function handleSubmit(values: NoteEditorValues) {
    setError(null);
    try {
      const note = await createNote.mutateAsync(values);
      navigate(`/notes/${note.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create note"));
    }
  }

  return (
    <div>
      <PageHeader title="New note" description="Paste in your cleaned-up class notes" />
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <NoteEditor
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
        isSubmitting={createNote.isPending}
        submitLabel="Create note"
      />
    </div>
  );
}
