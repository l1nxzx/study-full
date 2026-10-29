import { cn } from "@/lib/utils";

const FALLBACK_COLOR = "#64748b";

interface SubjectBadgeProps {
  name: string;
  color?: string | null;
  className?: string;
}

export function SubjectBadge({ name, color, className }: SubjectBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground",
        className
      )}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color || FALLBACK_COLOR }} />
      {name}
    </span>
  );
}
