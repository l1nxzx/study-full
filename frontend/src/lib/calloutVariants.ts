import { AlertTriangle, Info, Lightbulb, Pin, type LucideIcon } from "lucide-react";

export type CalloutVariant = "note" | "tip" | "important" | "warning";

export const CALLOUT_VARIANTS: CalloutVariant[] = ["note", "tip", "important", "warning"];

// The one place Study's callout styling is defined - shared by the read-side renderer
// (Callout.tsx) and the rich note editor's callout node, so both always agree. A callout is a
// ruled margin note: a coloured left rule, a small label, and the faintest wash of colour.
export const CALLOUT_VARIANT_CONFIG: Record<
  CalloutVariant,
  { icon: LucideIcon; label: string; classes: string; iconClasses: string }
> = {
  note: {
    icon: Info,
    label: "Note",
    classes: "border-l-accent bg-accent/[0.06]",
    iconClasses: "text-accent",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    classes: "border-l-ok bg-ok/[0.06]",
    iconClasses: "text-ok",
  },
  important: {
    icon: Pin,
    label: "Important",
    classes: "border-l-violet bg-violet/[0.07]",
    iconClasses: "text-violet",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    classes: "border-l-warn bg-warn/[0.07]",
    iconClasses: "text-warn",
  },
};

export const CALLOUT_BASE_CLASSES = "my-5 rounded-r-md border-l-2 py-2.5 pl-4 pr-4";

export function resolveCalloutVariant(variant?: string | null): CalloutVariant {
  return variant && variant in CALLOUT_VARIANT_CONFIG ? (variant as CalloutVariant) : "note";
}
