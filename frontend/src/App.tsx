import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "react-router-dom";
import { TOKEN_STORAGE_KEY } from "@/api/client";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import { clearPersistedCache, persistOptions, queryClient } from "@/lib/queryClient";
import { router } from "@/router";

// No token means signed out (or the session expired): drop any saved data before it can be restored.
if (!localStorage.getItem(TOKEN_STORAGE_KEY)) void clearPersistedCache();

export function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ToastProvider>
        <AuthProvider>
          {/* Navigations render right away instead of as a low-priority transition, which left the
              old page on screen for a few frames after the address had already changed. */}
          <RouterProvider router={router} useTransitions={false} />
        </AuthProvider>
      </ToastProvider>
    </PersistQueryClientProvider>
  );
}
