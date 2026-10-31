import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AiPanel } from "@/components/ai-panel/AiPanel";
import { useAiPanel } from "@/hooks/useAiPanel";
import { ShellProvider } from "@/hooks/useShell";
import { BottomNav, MobileHeader } from "./MobileNav";
import { BackButton } from "./BackButton";
import { PullToRefresh } from "./PullToRefresh";
import { SearchDialog } from "./SearchDialog";
import { Sidebar } from "./Sidebar";

function Shell() {
  const { pathname } = useLocation();
  const { toggle: toggleAssistant } = useAiPanel();
  const mainRef = useRef<HTMLElement>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // The page scrolls inside <main>, not the window, so reset it on navigation ourselves.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // On touch screens a new page settles in briefly, as in a native app, instead of cutting.
  // It animates the page already rendered, so nothing waits on it.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!window.matchMedia("(pointer: coarse) and (prefers-reduced-motion: no-preference)").matches) return;
    contentRef.current?.animate(
      [
        { opacity: 0.4, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
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
        <BackButton />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <PullToRefresh scrollRef={mainRef} />
          <BackButton variant="corner" />
          <main ref={mainRef} id="main" className="flex-1 overflow-y-auto overscroll-y-contain">
            <div ref={contentRef} className="@container px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 lg:px-12 lg:pb-20 lg:pt-11">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <AiPanel />
      <BottomNav />
      <SearchDialog />
    </div>
  );
}

export function AppLayout() {
  return (
    <ShellProvider>
      <Shell />
    </ShellProvider>
  );
}
