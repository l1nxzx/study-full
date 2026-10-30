import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/api/client";
import type { TestSettings } from "@/api/tests";
import * as templatesApi from "@/api/testTemplates";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InlineError } from "@/components/shared/EmptyState";
import { MoreMenu } from "@/components/shared/MoreMenu";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubjects } from "@/hooks/useSubjects";
import { useToast } from "@/hooks/useToast";

const NONE = "none";

function sameSettings(a: TestSettings, b: TestSettings) {
  return (
    a.difficulty === b.difficulty &&
    a.thinking === b.thinking &&
    a.logic === b.logic &&
    a.durationMinutes === b.durationMinutes &&
    (a.instructions ?? "").trim() === (b.instructions ?? "").trim()
  );
}

// Name and subject of a template; its settings are whatever the New test page shows.
function TemplateDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
  error,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: { name: string; subjectId: string | null };
  onSave: (value: { name: string; subjectId: string | null }) => void;
  saving: boolean;
  error: unknown;
  title: string;
}) {
  const { data: subjects } = useSubjects();
  const [name, setName] = useState(initial.name);
  const [subjectId, setSubjectId] = useState(initial.subjectId ?? NONE);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initial.name);
      setSubjectId(initial.subjectId ?? NONE);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) onSave({ name: name.trim(), subjectId: subjectId === NONE ? null : subjectId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>It keeps the settings and the notes for the AI as they are on this page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" htmlFor="template-name" hint="For example the subject and the teacher.">
            <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="Geography - Mr. Novák" />
          </Field>
          <Field label="For subject" hint="Picked automatically when you make a test from this subject's notes.">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger aria-label="For subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Any subject</SelectItem>
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <InlineError>{error ? getErrorMessage(error, "Couldn't save the template") : null}</InlineError>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? "Saving..." : "Save template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Saved test set-ups, one per teacher or subject. Choosing one fills in the settings and the
 * notes for the AI (still editable). A template for the subject of the chosen notes is picked
 * automatically while nothing has been changed by hand.
 */
export function TestTemplatePicker({
  settings,
  onApply,
  subjectId,
  untouched,
}: {
  settings: TestSettings;
  onApply: (settings: TestSettings) => void;
  /** The subject of the chosen notes, when they share one. */
  subjectId: string | null;
  /** Nothing changed by hand yet: a template may be picked automatically. */
  untouched: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: templates } = useQuery({ queryKey: ["testTemplates"], queryFn: templatesApi.listTemplates });
  const { data: subjects } = useSubjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"new" | "edit" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const autoPicked = useRef<string | null>(null);

  const selected = templates?.find((t) => t.id === selectedId) ?? null;
  const subjectName = (id: string | null) => subjects?.find((s) => s.id === id)?.name;
  const sorted = [...(templates ?? [])].sort((a, b) => Number(b.subjectId === subjectId) - Number(a.subjectId === subjectId));

  function pick(template: templatesApi.TestTemplate | null) {
    setSelectedId(template?.id ?? null);
    if (template) onApply(template.settings);
  }

  // From a subject's notes, its template is applied straight away - unless you already changed something.
  useEffect(() => {
    if (!templates || !subjectId || !untouched || selectedId || autoPicked.current === subjectId) return;
    const matches = templates.filter((t) => t.subjectId === subjectId);
    if (matches.length === 1) {
      autoPicked.current = subjectId;
      pick(matches[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, subjectId, untouched, selectedId]);

  const save = useMutation({
    mutationFn: (value: { name: string; subjectId: string | null }) =>
      dialog === "edit" && selected
        ? templatesApi.updateTemplate(selected.id, value)
        : templatesApi.createTemplate({ ...value, settings }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["testTemplates"] });
      setSelectedId(template.id);
      setDialog(null);
    },
  });

  const update = useMutation({
    mutationFn: () => templatesApi.updateTemplate(selected!.id, { settings }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["testTemplates"] });
      toast({ title: `"${template.name}" updated` });
    },
    onError: (err) => toast({ title: "Couldn't update the template", description: getErrorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: () => templatesApi.deleteTemplate(selected!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testTemplates"] });
      setSelectedId(null);
      setConfirmDelete(false);
    },
  });

  const changed = selected ? !sameSettings(selected.settings, settings) : false;

  return (
    <div>
      {templates && templates.length === 0 ? (
        <Button variant="outline" size="sm" onClick={() => setDialog("new")}>
          Save these settings as a template
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Select value={selectedId ?? NONE} onValueChange={(v) => pick(v === NONE ? null : (templates?.find((t) => t.id === v) ?? null))}>
            <SelectTrigger className="min-w-0 flex-1 sm:max-w-80" aria-label="Template">
              <SelectValue placeholder="No template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No template</SelectItem>
              {sorted.map((t) => {
                const subject = subjects?.find((s) => s.id === t.subjectId);
                return (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      {subject && <SubjectSwatch color={subject.color} />}
                      {t.name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <MoreMenu
            label="Template actions"
            items={[
              selected && changed && { label: `Update "${selected.name}" with these settings`, onSelect: () => update.mutate() },
              { label: "Save as a new template", onSelect: () => setDialog("new") },
              selected && { label: "Rename or change subject", onSelect: () => setDialog("edit") },
              selected && { label: `Delete "${selected.name}"`, onSelect: () => setConfirmDelete(true), destructive: true },
            ]}
          />
        </div>
      )}
      <p className="mt-2 text-meta text-fg-faint">
        {selected ? (
          changed ? (
            <>
              Changed from "{selected.name}".{" "}
              <button type="button" onClick={() => update.mutate()} disabled={update.isPending} className="text-accent underline-offset-4 hover:underline">
                Update the template
              </button>
            </>
          ) : autoPicked.current && selected.subjectId === subjectId ? (
            `Picked for ${subjectName(subjectId) ?? "this subject"}. Change anything below for this test.`
          ) : (
            "Change anything below for this test."
          )
        ) : templates && templates.length > 0 ? (
          "Your saved set-ups, for example one per teacher."
        ) : (
          "Keep a set-up per teacher - their kind of questions and how they grade - and reuse it."
        )}
      </p>

      <TemplateDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        initial={dialog === "edit" && selected ? { name: selected.name, subjectId: selected.subjectId } : { name: "", subjectId }}
        onSave={(value) => save.mutate(value)}
        saving={save.isPending}
        error={save.error}
        title={dialog === "edit" ? "Rename template" : "Save as a template"}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${selected?.name ?? ""}"?`}
        description="Tests made with it are not affected."
        confirmLabel="Delete template"
        onConfirm={() => remove.mutate()}
        isLoading={remove.isPending}
      />
    </div>
  );
}
