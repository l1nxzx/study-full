import { AlertTriangle, Info, Lightbulb, Sparkles, type LucideIcon } from "lucide-react";

export type CalloutVariant = "note" | "tip" | "important" | "warning";

export const CALLOUT_VARIANTS: CalloutVariant[] = ["note", "tip", "important", "warning"];

// The one place Study's callout styling is defined - shared by the read-side renderer
// (Callout.tsx) and the rich note editor's callout node, so both always agree.
export const CALLOUT_VARIANT_CONFIG: Record<
  CalloutVariant,
  { icon: LucideIcon; label: string; classes: string; iconClasses: string }
> = {
  note: {
    icon: Info,
    label: "Note",
    classes: "border-primary/30 bg-primary/5",
    iconClasses: "text-primary",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    classes: "border-success/30 bg-success/10",
    iconClasses: "text-success",
  },
  important: {
    icon: Sparkles,
    label: "Important",
    classes: "border-callout-important/30 bg-callout-important/10",
    iconClasses: "text-callout-important",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    classes: "border-warning/30 bg-warning/10",
    iconClasses: "text-warning",
  },
};

export function resolveCalloutVariant(variant?: string | null): CalloutVariant {
  return variant && variant in CALLOUT_VARIANT_CONFIG ? (variant as CalloutVariant) : "note";
}
