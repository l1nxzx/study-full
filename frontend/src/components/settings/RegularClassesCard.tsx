import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ClassFormDialog } from "@/components/schedule/ClassFormDialog";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { WEEKDAY_LABELS } from "@/lib/nav";
import type { ClassEntity } from "@/types";

// Monday first, as the timetable is read.
const dayOrder = (weekday: number) => (weekday + 6) % 7;

/**
 * The regular weekly timetable. Its subjects are the "fixed" subjects: the school's lessons are
 * matched to them by name, and only they are created automatically from the school calendar.
 */
export function RegularClassesCard() {
  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects();
  const [dialog, setDialog] = useState<{ open: boolean; editing: ClassEntity | null }>({ open: false, editing: null });

  const subjectById = useMemo(() => new Map((subjects ?? []).map((s) => [s.id, s])), [subjects]);
  const sorted = useMemo(
    () =>
      [...(classes ?? [])].sort((a, b) => dayOrder(a.weekday) - dayOrder(b.weekday) || a.startTime.localeCompare(b.startTime)),
    [classes]
  );
  const fixedSubjects = useMemo(() => {
    const names = new Set<string>();
    for (const c of classes ?? []) {
      const name = subjectById.get(c.subjectId)?.name;
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [classes, subjectById]);

  return (
    <SettingsSection
      title="Regular classes"
      description="Your normal week. It shows on days without school events. School lessons are matched to these subjects by name; other school events show by their name, without a subject."
    >
      <div className="space-y-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-fg-faint">No regular classes yet.</p>
        ) : (
          <ul className="divide-y divide-rule rounded-md border border-rule">
            {sorted.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setDialog({ open: true, editing: c })}
                  className="flex w-full items-baseline gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-tint"
                >
                  <span className="w-10 shrink-0 text-fg-muted">{WEEKDAY_LABELS[c.weekday]}</span>
                  <span className="tabular shrink-0 text-fg-muted">
                    {c.startTime}–{c.endTime}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{subjectById.get(c.subjectId)?.name ?? "Subject"}</span>
                  {c.room && <span className="shrink-0 text-meta text-fg-faint">{c.room}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setDialog({ open: true, editing: null })}>
            <Plus />
            Add class
          </Button>
          {fixedSubjects.length > 0 && (
            <p className="text-meta text-fg-faint">Subjects: {fixedSubjects.join(", ")}</p>
          )}
        </div>
      </div>
      <ClassFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        editingClass={dialog.editing}
      />
    </SettingsSection>
  );
}
