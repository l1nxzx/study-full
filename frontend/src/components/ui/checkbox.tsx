import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer relative size-4 shrink-0 rounded-sm border border-rule-strong bg-canvas transition-colors hover:border-fg-faint",
        "before:absolute before:-inset-2.5 before:content-['']",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-accent-fill data-[state=checked]:bg-accent-fill data-[state=checked]:text-on-accent",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
