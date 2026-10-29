import { NotebookText, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { NoteCard } from "@/components/notes/NoteCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotes } from "@/hooks/useNotes";
import { useSubjects } from "@/hooks/useSubjects";

export function NotesListPage() {
  const [subjectId, setSubjectId] = useState<string>("all");
  const { data: subjects } = useSubjects();
  const { data: notes, isLoading } = useNotes(subjectId === "all" ? {} : { subjectId });

  const subjectById = new Map((subjects || []).map((s) => [s.id, s]));

  return (
    <div>
      <PageHeader
        title="Notes"
        description="Your class notes, cleaned up and searchable."
        actions={
          <Button asChild>
            <Link to="/notes/new">
              <Plus /> Add Note
            </Link>
          </Button>
        }
      />

      {subjects && subjects.length > 0 && (
        <div className="mb-5 w-48">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
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
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && notes?.length === 0 && (
        <EmptyState
          icon={NotebookText}
          title="No notes yet"
          description="Add your first class notes to start building your study library."
          action={
            <Button asChild>
              <Link to="/notes/new">
                <Plus /> Add Note
              </Link>
            </Button>
          }
        />
      )}

      {!isLoading && notes && notes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} subject={subjectById.get(note.subjectId)} />
          ))}
        </div>
      )}
    </div>
  );
}
