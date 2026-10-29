import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Shared field look for inputs, textareas and select triggers.
export const fieldClasses =
  "w-full rounded-md border border-rule-strong bg-canvas text-sm text-fg transition-colors placeholder:text-fg-faint hover:border-fg-faint/60 focus-visible:border-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        fieldClasses,
        "h-10 px-3 sm:h-9",
        "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert",
        className
      )}
      {...props}
    />
  );
}

export { Input };
