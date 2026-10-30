import { format, parseISO } from "date-fns";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Page, PageHeader } from "@/components/layout/PageHeader";
import { NoteRow } from "@/components/notes/NoteRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotes } from "@/hooks/useNotes";
import { useSubjects } from "@/hooks/useSubjects";
import type { Note } from "@/types";

// Notes grouped by the month they were taken, newest first - the way a binder is organised.
function groupByMonth(notes: Note[]): { label: string; notes: Note[] }[] {
  const groups = new Map<string, Note[]>();
  for (const note of notes) {
    const key = note.date.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(note);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => ({ label: format(parseISO(`${key}-01`), "MMMM yyyy"), notes: list }));
}

export function NotesListPage() {
  const [subjectId, setSubjectId] = useState<string>("all");
  const [filter, setFilter] = useState("");
  const { data: subjects } = useSubjects();
  const { data: notes, isLoading } = useNotes(subjectId === "all" ? {} : { subjectId });

  const subjectById = new Map((subjects || []).map((s) => [s.id, s]));
  const needle = filter.trim().toLowerCase();
  const visible = (notes || []).filter((n) => !needle || n.title.toLowerCase().includes(needle));
  const groups = groupByMonth(visible);

  const newNoteButton = (
    <Button asChild>
      <Link to={subjectId === "all" ? "/notes/new" : `/notes/new?subjectId=${subjectId}`}>
        <Plus /> New note
      </Link>
    </Button>
  );

  return (
    <Page>
      <PageHeader
        title="Notes"
        description={notes && notes.length > 0 ? `${notes.length} ${notes.length === 1 ? "note" : "notes"}` : "Your class notes, cleaned up and searchable."}
        actions={newNoteButton}
      />

      {((notes && notes.length > 0) || subjectId !== "all") && (
        <div className="mb-8 flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by title" aria-label="Filter notes by title" className="pl-9" />
          </div>
          {subjects && subjects.length > 0 && (
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="sm:w-52" aria-label="Subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {isLoading && (
        <div className="divide-y divide-rule">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="py-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-2.5 h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && notes?.length === 0 && (
        <EmptyState
          title={subjectId === "all" ? "No notes yet" : "No notes for this subject yet"}
          description="Photograph or scan your handwritten notes, turn them into Markdown with ChatGPT or Claude using the conversion prompt in the editor, and paste the result into a new note."
          action={newNoteButton}
        />
      )}

      {!isLoading && notes && notes.length > 0 && visible.length === 0 && (
        <EmptyState title={`No titles match "${filter.trim()}"`} description="Try another word, or search the content of every note with Ctrl+K." />
      )}

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="group-label border-b border-rule pb-2">{group.label}</h2>
            <div className="divide-y divide-rule">
              {group.notes.map((note) => (
                <NoteRow key={note.id} note={note} subject={subjectById.get(note.subjectId)} showSubject={subjectId === "all"} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}
