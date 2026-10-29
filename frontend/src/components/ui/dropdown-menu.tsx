import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const menuSurfaceClasses = "z-50 overflow-hidden rounded-md border border-rule bg-raised p-1 text-fg shadow-md";

function DropdownMenuContent({ className, sideOffset = 4, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content sideOffset={sideOffset} className={cn(menuSurfaceClasses, "min-w-[11rem]", className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & { variant?: "default" | "destructive" }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 text-sm outline-none sm:min-h-8",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-tint",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-faint",
        variant === "destructive" && "text-bad data-[highlighted]:bg-bad/10 [&_svg]:text-bad",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label className={cn("px-2.5 pb-1 pt-1.5 text-meta text-fg-faint", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-rule", className)} {...props} />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator };
