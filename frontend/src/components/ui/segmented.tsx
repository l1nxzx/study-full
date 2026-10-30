import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

/**
 * A row of mutually exclusive choices (Day / Week, Easy / Medium / Hard). Used instead of a
 * Select whenever all options fit, so a choice is one click and always visible.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-md border border-rule-strong p-0.5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-sm px-2.5 font-medium whitespace-nowrap transition-colors disabled:opacity-40",
              size === "sm" ? "h-8 text-[0.8125rem] sm:h-7" : "h-9 text-sm sm:h-8",
              active ? "bg-tint text-fg" : "text-fg-muted hover:text-fg"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
