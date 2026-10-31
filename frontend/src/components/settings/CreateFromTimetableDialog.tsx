import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getErrorMessage } from "@/api/client";
import * as classesApi from "@/api/classes";
import * as subjectsApi from "@/api/subjects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineError } from "@/components/shared/EmptyState";
import { useClasses } from "@/hooks/useClasses";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { useSubjects } from "@/hooks/useSubjects";
import { WEEKDAY_LABELS_FULL } from "@/lib/nav";
import { firstUnusedColor } from "@/lib/scheduleColors";
import type { ScheduleEvent, Weekday } from "@/types";

const DAY_MS = 86_400_000;

// Local date as YYYY-MM-DD (the timetable's date format).
function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// The Monday of the week that contains `date`.
function mondayOf(date: Date): Date {
  const offset = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

interface Proposal {
  key: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  title: string;
  room: string | null;
  /** Subject this lesson would use: an existing one, or a new one created on confirm. */
  existingSubjectId: string | null;
}

/**
 * Builds the regular week from a school week: each lesson of the chosen week becomes a regular
 * class on its weekday. Nothing is created until the user confirms, and a lesson whose subject
 * doesn't exist yet is unticked by default, since creating a subject is the user's choice.
 */
export function CreateFromTimetableDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date(Date.now() + 7 * DAY_MS)));
  const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
  const { data: events, isLoading } = useScheduleEvents(ymd(weekStart), ymd(weekEnd), { enabled: open });
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectByName = useMemo(() => new Map((subjects ?? []).map((s) => [s.name.trim().toLowerCase(), s])), [subjects]);

  const proposals = useMemo<Proposal[]>(() => {
    const seen = new Map<string, Proposal>();
    for (const e of (events ?? []) as ScheduleEvent[]) {
      if (e.status === "cancelled") continue;
      const weekday = new Date(`${e.date}T12:00:00`).getDay() as Weekday;
      const key = `${weekday}|${e.startTime}|${e.endTime}|${e.title.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        key,
        weekday,
        startTime: e.startTime,
        endTime: e.endTime,
        title: e.title.trim(),
        room: e.room,
        existingSubjectId: subjectByName.get(e.title.trim().toLowerCase())?.id ?? null,
      });
    }
    return [...seen.values()].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.startTime.localeCompare(b.startTime));
  }, [events, subjectByName]);

  // Lessons already in the regular week are not offered again.
  const alreadyThere = useMemo(() => {
    const names = new Map((subjects ?? []).map((s) => [s.id, s.name.trim().toLowerCase()]));
    return new Set((classes ?? []).map((c) => `${c.weekday}|${c.startTime}|${c.endTime}|${names.get(c.subjectId) ?? ""}`));
  }, [classes, subjects]);

  const offered = proposals.filter((p) => !alreadyThere.has(`${p.weekday}|${p.startTime}|${p.endTime}|${p.title.toLowerCase()}`));
  // Default: ticked when the subject exists already; new subjects are left for the user to tick.
  const selected = picked ?? new Set(offered.filter((p) => p.existingSubjectId).map((p) => p.key));

  function shiftWeek(weeks: number) {
    setWeekStart(new Date(weekStart.getTime() + weeks * 7 * DAY_MS));
    setPicked(null);
  }

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const chosen = offered.filter((p) => selected.has(p.key));
      const usedColors = (subjects ?? []).map((s) => s.color);
      // A new subject is created once, even when several chosen lessons share its name.
      const newSubjectIds = new Map<string, string>();
      for (const p of chosen) {
        let subjectId = p.existingSubjectId ?? newSubjectIds.get(p.title.toLowerCase()) ?? null;
        if (!subjectId) {
          const color = firstUnusedColor(usedColors);
          usedColors.push(color);
          const created = await subjectsApi.createSubject({ name: p.title, color });
          subjectId = created.id;
          newSubjectIds.set(p.title.toLowerCase(), created.id);
        }
        await classesApi.createClass({
          subjectId,
          weekday: p.weekday,
          startTime: p.startTime,
          endTime: p.endTime,
          room: p.room ?? undefined,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      await queryClient.invalidateQueries({ queryKey: ["subjects"] });
      onOpenChange(false);
      setPicked(null);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't create every class. The ones already created are kept."));
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      await queryClient.invalidateQueries({ queryKey: ["subjects"] });
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setPicked(next);
  }

  const label = `${weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create from school timetable</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>
            Previous week
          </Button>
          <p className="text-sm text-fg-muted">{label}</p>
          <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>
            Next week
          </Button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-fg-faint">Loading the week…</p>
          ) : offered.length === 0 ? (
            <p className="text-sm text-fg-faint">No school lessons in this week. Try another week.</p>
          ) : (
            <ul className="divide-y divide-rule rounded-md border border-rule">
              {offered.map((p) => (
                <li key={p.key}>
                  <label className="flex cursor-pointer items-baseline gap-3 px-3 py-2.5 text-sm">
                    <input type="checkbox" checked={selected.has(p.key)} onChange={() => toggle(p.key)} className="self-center" />
                    <span className="w-24 shrink-0 text-fg-muted">{WEEKDAY_LABELS_FULL[p.weekday]}</span>
                    <span className="tabular shrink-0 text-fg-muted">
                      {p.startTime}–{p.endTime}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    {!p.existingSubjectId && <span className="shrink-0 text-meta text-fg-faint">new subject</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <InlineError>{error}</InlineError>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={saving || selected.size === 0}>
            {saving ? "Creating..." : `Create ${selected.size} ${selected.size === 1 ? "class" : "classes"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
