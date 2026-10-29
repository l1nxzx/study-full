import type { ReactNode } from "react";
import { CALLOUT_VARIANT_CONFIG, resolveCalloutVariant } from "@/lib/calloutVariants";
import { cn } from "@/lib/utils";

export function Callout({ variant, children }: { variant?: string; children?: ReactNode }) {
  const config = CALLOUT_VARIANT_CONFIG[resolveCalloutVariant(variant)];

  return (
    <div className={cn("my-4 rounded-lg border px-4 py-3 not-italic [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0", config.classes)}>
      <div className={cn("mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", config.iconClasses)}>
        <config.icon className="size-3.5" />
        {config.label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
