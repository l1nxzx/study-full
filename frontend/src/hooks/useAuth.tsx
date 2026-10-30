import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import * as authApi from "@/api/auth";
import { TOKEN_STORAGE_KEY } from "@/api/client";
import { applyPreferences, cachePreferences } from "@/lib/preferences";
import { clearPersistedCache } from "@/lib/queryClient";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** The session couldn't be checked (server unreachable) - not the same as being logged out. */
  connectionError: boolean;
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isUnauthorized(err: unknown) {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));
  const queryClient = useQueryClient();

  // The backend sleeps when idle and can take up to a minute to wake. Keep retrying network
  // and server errors patiently instead of concluding "logged out" - only a 401 means that.
  const { data: user, isPending, isError, error, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    enabled: hasToken,
    retry: (count, err) => !isUnauthorized(err) && count < 5,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 10_000),
    networkMode: "always",
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (user?.preferences) {
      applyPreferences(user.preferences);
      cachePreferences(user.preferences);
    }
  }, [user?.preferences]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setHasToken(true);
    queryClient.setQueryData(["auth", "me"], result.user);
  }, [queryClient]);

  const register = useCallback(async (email: string, password: string) => {
    const result = await authApi.register(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setHasToken(true);
    queryClient.setQueryData(["auth", "me"], result.user);
  }, [queryClient]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setHasToken(false);
    queryClient.clear();
    void clearPersistedCache();
  }, [queryClient]);

  const connectionError = hasToken && isError && !isUnauthorized(error);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading: hasToken && isPending && !isError,
      isAuthenticated: Boolean(user),
      connectionError,
      retry: () => void refetch(),
      login,
      register,
      logout,
    }),
    [user, hasToken, isPending, isError, connectionError, refetch, login, register, logout]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
