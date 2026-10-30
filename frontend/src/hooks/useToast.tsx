import { createContext, use, useCallback, useState, type ReactNode } from "react";
import { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider as ToastPrimitiveProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

interface ToastInput {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: string;
}

const ToastContext = createContext<{ toast: (input: ToastInput) => void } | null>(null);

// A minimal global toast queue - used for feedback on actions that update the UI
// optimistically (e.g. toggling a task complete) so a failed request can be reported
// without blocking or re-litigating the action the user already saw happen.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...input, id }]);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext value={{ toast }}>
      <ToastPrimitiveProvider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <Toast key={t.id} variant={t.variant} duration={t.duration ?? 5000} onOpenChange={(open) => !open && dismiss(t.id)}>
            <div className="flex-1">
              <ToastTitle>{t.title}</ToastTitle>
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
              {t.action && (
                <ToastAction
                  altText={t.action.label}
                  onClick={t.action.onClick}
                  className="mt-2 text-[0.8125rem] font-medium text-accent underline-offset-4 hover:underline"
                >
                  {t.action.label}
                </ToastAction>
              )}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastPrimitiveProvider>
    </ToastContext>
  );
}

export function useToast() {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
