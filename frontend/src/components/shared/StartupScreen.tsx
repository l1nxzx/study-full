import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// Shown while a saved session is being checked. The server can be asleep after a quiet
// period, so after a moment this says so instead of looking frozen, and a failed check offers
// a retry rather than pretending you're logged out.
export function StartupScreen() {
  const { connectionError, retry, logout } = useAuth();
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center" aria-busy={!connectionError}>
      <div className="w-full max-w-sm">
        <p className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-fg">Study</p>
        {connectionError ? (
          <>
            <p className="mt-6 text-sm font-medium text-fg">Can't reach the server right now</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">Check your connection. You're still signed in.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button onClick={retry}>Try again</Button>
              <Button variant="ghost" onClick={logout}>
                Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mt-6 h-0.5 w-40 overflow-hidden rounded-full bg-rule">
              <div className="h-full w-1/3 animate-[startup-slide_1.4s_ease-in-out_infinite] rounded-full bg-accent" />
            </div>
            {waited >= 2 && <p className="mt-4 text-sm text-fg-muted">Signing you in...</p>}
            {waited >= 6 && (
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-fg-faint">
                The server is waking up after a quiet period. This can take up to a minute.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
