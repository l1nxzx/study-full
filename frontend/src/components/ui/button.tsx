import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// One filled style (the accent) for the single primary action on a surface; everything else
// is quiet. Corners stay small, and nothing scales, glows or casts a shadow on hover.
const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent-fill text-on-accent hover:bg-accent-fill/88 active:bg-accent-fill/80",
        secondary: "border border-rule-strong bg-tint/60 text-fg hover:bg-tint active:bg-tint/70",
        outline: "border border-rule-strong text-fg hover:bg-tint/70 active:bg-tint",
        ghost: "text-fg-muted hover:bg-tint hover:text-fg active:bg-tint/70",
        destructive: "border border-bad/40 text-bad hover:bg-bad/10 active:bg-bad/15",
        link: "h-auto px-0 text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-3.5 sm:h-9",
        sm: "h-9 px-3 text-[0.8125rem] sm:h-8 sm:px-2.5",
        lg: "h-11 px-5 sm:h-10",
        // Phones get a 44px touch target around icon buttons without changing how they look.
        icon: "relative size-10 sm:size-9 pointer-coarse:after:absolute pointer-coarse:after:-inset-0.5",
        "icon-sm": "relative size-9 sm:size-8 pointer-coarse:after:absolute pointer-coarse:after:-inset-1",
      },
    },
    compoundVariants: [{ variant: "link", class: "h-auto px-0 sm:h-auto sm:px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}

export { Button, buttonVariants };
