import type { ReactNode } from "react";
import { InlineError } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SkeletonLines } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** The scrolling body every tool renders into, so all tools share the same margins. */
export function ToolBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex-1 overflow-y-auto px-5 py-6", className)}>{children}</div>;
}

/** A setup screen: one sentence on what the tool does, the options, and one button. */
export function ToolSetup({
  intro,
  children,
  error,
  submitLabel,
  onSubmit,
  disabled,
}: {
  intro: ReactNode;
  children: ReactNode;
  error?: string | null;
  submitLabel: string;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-fg-muted">{intro}</p>
      <div className="space-y-5">{children}</div>
      <InlineError>{error}</InlineError>
      <Button className="w-full" onClick={onSubmit} disabled={disabled}>
        {submitLabel}
      </Button>
    </div>
  );
}

export function SetupRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[0.8125rem] font-medium text-fg-muted">{label}</p>
      {children}
    </div>
  );
}

export function BeyondNotesOption({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span>
        <span className="text-fg">Add one question beyond my notes</span>
        <span className="mt-0.5 block text-meta text-fg-faint">Tests related knowledge that isn't in the note, and is marked as such.</span>
      </span>
    </label>
  );
}

export function GeneratingState({ label }: { label: string }) {
  return (
    <div className="space-y-4" aria-live="polite">
      <p className="text-sm text-fg-muted">{label}</p>
      <SkeletonLines lines={4} />
      <SkeletonLines lines={3} className="pt-3" />
    </div>
  );
}

export function BeyondNotesMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-meta text-warn", className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-warn" />
      Beyond your notes
    </span>
  );
}
