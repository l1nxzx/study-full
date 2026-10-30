import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

interface ShellContextValue {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  openSearch: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

// Small app-shell state shared by the sidebar, phone header and the search palette.
export function ShellProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const value = useMemo(() => ({ searchOpen, setSearchOpen, openSearch }), [searchOpen, openSearch]);
  return <ShellContext value={value}>{children}</ShellContext>;
}

export function useShell() {
  const ctx = use(ShellContext);
  if (!ctx) throw new Error("useShell must be used within a ShellProvider");
  return ctx;
}
