import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AiPanel } from "@/components/ai-panel/AiPanel";
import { AiPanelProvider, useAiPanel } from "@/hooks/useAiPanel";
import { ShellProvider } from "@/hooks/useShell";
import { BottomNav, MobileHeader } from "./MobileNav";
import { SearchDialog } from "./SearchDialog";
import { Sidebar } from "./Sidebar";

function Shell() {
  const { pathname } = useLocation();
  const { toggle: toggleAssistant } = useAiPanel();
  const mainRef = useRef<HTMLElement>(null);

  // The page scrolls inside <main>, not the window, so reset it on navigation ourselves.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleAssistant();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleAssistant]);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileHeader />
        <main ref={mainRef} id="main" className="flex-1 overflow-y-auto">
          <div className="@container px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 lg:px-12 lg:pb-20 lg:pt-11">
            <Outlet />
          </div>
        </main>
      </div>
      <AiPanel />
      <BottomNav />
      <SearchDialog />
    </div>
  );
}

export function AppLayout() {
  return (
    <AiPanelProvider>
      <ShellProvider>
        <Shell />
      </ShellProvider>
    </AiPanelProvider>
  );
}
