import type { ReactNode } from "react";
import { CALLOUT_BASE_CLASSES, CALLOUT_VARIANT_CONFIG, resolveCalloutVariant } from "@/lib/calloutVariants";
import { cn } from "@/lib/utils";

export function Callout({ variant, children }: { variant?: string; children?: ReactNode }) {
  const config = CALLOUT_VARIANT_CONFIG[resolveCalloutVariant(variant)];

  return (
    <div className={cn(CALLOUT_BASE_CLASSES, config.classes)}>
      <div className={cn("mb-1 flex items-center gap-1.5 font-sans text-meta font-semibold", config.iconClasses)}>
        <config.icon className="size-3.5" />
        {config.label}
      </div>
      <div className="text-[0.95em] text-fg [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>p]:my-1.5">{children}</div>
    </div>
  );
}
