import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;

function ToastViewport({ className, ...props }: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        "fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-[100] mx-auto flex w-full max-w-sm flex-col gap-2 p-4 outline-none lg:inset-x-auto lg:bottom-0 lg:right-0",
        className
      )}
      {...props}
    />
  );
}

function Toast({ className, variant = "default", ...props }: ComponentProps<typeof ToastPrimitive.Root> & { variant?: "default" | "destructive" }) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "group pointer-events-auto relative flex w-full items-start gap-3 rounded-md border border-rule bg-raised py-3 pl-4 pr-9 shadow-md transition-opacity duration-150",
        "data-[state=closed]:opacity-0 data-[swipe=end]:translate-x-full",
        variant === "destructive" && "border-l-2 border-l-bad",
        className
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cn("text-sm font-medium text-fg", className)} {...props} />;
}

function ToastDescription({ className, ...props }: ComponentProps<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description className={cn("mt-0.5 text-[0.8125rem] text-fg-muted", className)} {...props} />;
}

function ToastAction(props: ComponentProps<typeof ToastPrimitive.Action>) {
  return <ToastPrimitive.Action {...props} />;
}

function ToastClose({ className, ...props }: ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      className={cn("absolute right-2 top-2.5 flex size-6 items-center justify-center rounded-sm text-fg-faint hover:bg-tint hover:text-fg", className)}
      {...props}
    >
      <X className="size-3.5" />
    </ToastPrimitive.Close>
  );
}

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction, ToastClose };
