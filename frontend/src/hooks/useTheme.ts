import { useEffect, useState } from "react";
import { setThemeColor } from "@/lib/themeColor";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "study.theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
  setThemeColor();
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as Theme) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  return { theme, setTheme };
}
