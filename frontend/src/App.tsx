import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import { queryClient } from "@/lib/queryClient";
import { router } from "@/router";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          {/* Navigations render right away instead of as a low-priority transition, which left the
              old page on screen for a few frames after the address had already changed. */}
          <RouterProvider router={router} useTransitions={false} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
