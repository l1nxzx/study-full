import { Outlet } from "react-router-dom";
import { AiFloatingButton } from "@/components/ai-panel/AiToggleButton";
import { AiPanel } from "@/components/ai-panel/AiPanel";
import { AiPanelProvider } from "@/hooks/useAiPanel";
import { Sidebar } from "./Sidebar";
import { BottomNav, MobileHeader } from "./MobileNav";

export function AppLayout() {
  return (
    <AiPanelProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
        <BottomNav />
        <AiFloatingButton />
        <AiPanel />
      </div>
    </AiPanelProvider>
  );
}
