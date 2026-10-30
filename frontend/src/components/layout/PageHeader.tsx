import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const PAGE_WIDTHS = {
  reading: "max-w-[46rem]",
  default: "max-w-[62rem]",
  wide: "max-w-[80rem]",
} as const;

/**
 * Every page sits in the same frame (padding set once in AppLayout) and starts at the same left
 * edge. `width` only limits how far the page extends to the right; pages are never centred on
 * their own, so moving between sections never shifts content sideways.
 */
export function Page({
  width = "default",
  className,
  children,
}: {
  width?: keyof typeof PAGE_WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("w-full", PAGE_WIDTHS[width], className)}>{children}</div>;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** A "more" menu, pinned to the header's top-right corner at every width. */
  menu?: ReactNode;
  back?: { to: string; label: string };
  className?: string;
}

export function PageHeader({ title, description, actions, menu, back, className }: PageHeaderProps) {
  return (
    <header className={cn("relative mb-8 lg:mb-10", className)}>
      {menu && <div className="absolute -right-2 top-0">{menu}</div>}
      {back && <BackLink to={back.to} label={back.label} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className={cn("min-w-0", menu && !back && "pr-10")}>
          {typeof title === "string" ? <h1 className="page-title">{title}</h1> : title}
          {description && <div className="mt-1 text-sm text-fg-muted">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="-ml-1 mb-3 inline-flex h-7 items-center gap-1 rounded-sm px-1 text-[0.8125rem] text-fg-muted transition-colors hover:text-fg"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}

/** A titled group of content, ruled off underneath. Rows inside are separated by hairlines too. */
export function Section({
  title,
  action,
  description,
  className,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <div className="flex min-h-9 items-end justify-between gap-3 border-b border-rule pb-2">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description && <p className="text-meta text-fg-faint">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-[0.8125rem] text-fg-muted transition-colors hover:text-accent">
      {children}
    </Link>
  );
}
