import { Link } from "react-router-dom";
import { SubjectLabel } from "@/components/shared/SubjectSwatch";
import { formatDateShort } from "@/lib/date";
import { notePreview } from "@/lib/notePreview";
import { cn } from "@/lib/utils";
import type { Note, Subject } from "@/types";

interface NoteRowProps {
  note: Note;
  subject?: Subject;
  /** Hide the subject when every row belongs to the same one (e.g. on a subject's page). */
  showSubject?: boolean;
  className?: string;
}

/** A note in a list: serif title (it's material), a line of its text, then subject and date. */
export function NoteRow({ note, subject, showSubject = true, className }: NoteRowProps) {
  const preview = notePreview(note.contentMarkdown, note.title);

  return (
    <Link to={`/notes/${note.id}`} className={cn("group flex gap-6 py-3.5 transition-opacity active:opacity-60", className)}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[1.0625rem] font-medium leading-snug text-fg transition-colors [font-variation-settings:'opsz'_20] group-hover:text-accent">
          {note.title}
        </p>
        {preview && <p className="mt-1 line-clamp-1 text-[0.8125rem] leading-relaxed text-fg-muted">{preview}</p>}
        <p className="mt-1.5 flex items-center gap-2 text-meta text-fg-faint @xl:hidden">
          {showSubject && subject && <SubjectLabel name={subject.name} color={subject.color} />}
          {showSubject && subject && <span aria-hidden>·</span>}
          <span className="tabular">{formatDateShort(note.date)}</span>
        </p>
      </div>
      <div className="hidden w-40 shrink-0 flex-col items-end gap-1 pt-1 text-meta text-fg-faint @xl:flex">
        <span className="tabular">{formatDateShort(note.date)}</span>
        {showSubject && subject && <SubjectLabel name={subject.name} color={subject.color} className="max-w-full" />}
      </div>
    </Link>
  );
}
