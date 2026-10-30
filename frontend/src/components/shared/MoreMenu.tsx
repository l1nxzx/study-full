import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MoreMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

// The "more" button: a quiet three-dot icon that opens the less frequent actions of a page or a
// row. Destructive actions go last, below a separator.
export function MoreMenu({ items, label = "More actions", className }: { items: (MoreMenuItem | false | null | undefined)[]; label?: string; className?: string }) {
  const actions = items.filter(Boolean) as MoreMenuItem[];
  const plain = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-tint hover:text-fg data-[state=open]:bg-tint data-[state=open]:text-fg sm:size-8",
          className
        )}
        aria-label={label}
        title={label}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {plain.map((a) => (
          <DropdownMenuItem key={a.label} onSelect={a.onSelect} disabled={a.disabled}>
            {a.icon}
            {a.label}
          </DropdownMenuItem>
        ))}
        {plain.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((a) => (
          <DropdownMenuItem key={a.label} variant="destructive" onSelect={a.onSelect} disabled={a.disabled}>
            {a.icon}
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
