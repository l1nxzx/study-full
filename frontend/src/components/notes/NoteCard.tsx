import { Link } from "react-router-dom";
import { SubjectBadge } from "@/components/shared/SubjectBadge";
import { formatDateShort } from "@/lib/date";
import type { Note, Subject } from "@/types";

interface NoteCardProps {
  note: Note;
  subject?: Subject;
}

function buildPreview(markdown: string, title: string): string {
  const withoutLeadingHeading = markdown.replace(/^\s*#{1,6}\s.*\n?/, "");
  const plain = withoutLeadingHeading.replace(/[#*`>_-]/g, "").trim();
  return plain.startsWith(title) ? plain.slice(title.length).trim().slice(0, 120) : plain.slice(0, 120);
}

export function NoteCard({ note, subject }: NoteCardProps) {
  const preview = buildPreview(note.contentMarkdown, note.title);

  return (
    <Link
      to={`/notes/${note.id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-foreground">{note.title}</h3>
        <span className="shrink-0 text-xs text-muted-foreground">{formatDateShort(note.date)}</span>
      </div>
      {preview && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{preview}</p>}
      {subject && <SubjectBadge name={subject.name} color={subject.color} />}
    </Link>
  );
}
