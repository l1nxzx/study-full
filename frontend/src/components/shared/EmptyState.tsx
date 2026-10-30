import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

// Plain text where content would be: what's missing, why it matters, and the one thing to do
// about it. No illustration, no dashed box.
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("py-6", className)}>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function InlineError({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={cn("text-sm text-bad", className)}>
      {children}
    </p>
  );
}
