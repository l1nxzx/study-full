import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/api/auth";
import { TOKEN_STORAGE_KEY } from "@/api/client";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    enabled: hasToken,
    retry: false,
  });

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
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading: hasToken && isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, hasToken, isLoading, login, register, logout]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
