import { Navigate, Outlet } from "react-router-dom";
import { StartupScreen } from "@/components/shared/StartupScreen";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { AiPanelProvider } from "@/hooks/useAiPanel";
import { useAuth } from "@/hooks/useAuth";
import { useTestWritingWatcher } from "@/hooks/useTestWritingWatcher";

function SignedIn() {
  useActivityTracker();
  useTestWritingWatcher();
  return <Outlet />;
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, connectionError } = useAuth();

  if (isLoading || connectionError) return <StartupScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // The assistant's state lives above the app shell so the full-screen notebook reader (outside
  // the shell) shares it, and the activity tracker can see what you're doing in it.
  return (
    <AiPanelProvider>
      <SignedIn />
    </AiPanelProvider>
  );
}
