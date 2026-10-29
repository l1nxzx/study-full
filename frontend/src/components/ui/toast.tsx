import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;

function ToastViewport({ className, ...props }: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn("fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none", className)}
      {...props}
    />
  );
}

function Toast({ className, variant = "default", ...props }: ComponentProps<typeof ToastPrimitive.Root> & { variant?: "default" | "destructive" }) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "group pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border bg-card p-4 pr-8 shadow-lg transition-all duration-200",
        "data-[state=closed]:opacity-0 data-[swipe=end]:translate-x-full",
        variant === "destructive" ? "border-destructive/40" : "border-border",
        className
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cn("text-sm font-semibold text-foreground", className)} {...props} />;
}

function ToastDescription({ className, ...props }: ComponentProps<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description className={cn("mt-0.5 text-xs text-muted-foreground", className)} {...props} />;
}

function ToastClose({ className, ...props }: ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      className={cn("absolute right-2 top-2 rounded-sm opacity-60 transition-opacity hover:opacity-100", className)}
      {...props}
    >
      <X className="size-3.5" />
    </ToastPrimitive.Close>
  );
}

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose };
