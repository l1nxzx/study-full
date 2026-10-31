import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useCloseOnBack } from "@/lib/closeOnBack";
import { Menu, MessagesSquare, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAiPanel } from "@/hooks/useAiPanel";
import { useShell } from "@/hooks/useShell";
import { mainNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { AccountRows, Brand, NavigationList } from "./Sidebar";

const headerButton =
  "flex size-10 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-tint hover:text-fg active:bg-tint";

function currentSectionLabel(pathname: string): string {
  const item = mainNavItems.find((i) => pathname.startsWith(i.to));
  if (item) return item.label;
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Study";
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  useCloseOnBack(open, () => setOpen(false));
  const { openSearch } = useShell();
  const { isOpen: assistantOpen, toggle: toggleAssistant } = useAiPanel();
  const { pathname } = useLocation();

  // Going to another page closes the drawer only once that page has opened. Closing on the tap
  // let the drawer's Back run while the router was still loading the page (a lazy chunk), which
  // undid the navigation: the first tap then seemed to do nothing.
  const closeWhenArrived = useRef(false);
  useEffect(() => {
    if (!closeWhenArrived.current) return;
    closeWhenArrived.current = false;
    setOpen(false);
  }, [pathname]);
  function onNavigate(to: string) {
    if (to === pathname) setOpen(false);
    else closeWhenArrived.current = true;
  }

  return (
    <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-1 border-b border-rule bg-canvas px-2 pt-[env(safe-area-inset-top)] lg:hidden">
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger className={headerButton} aria-label="Open menu">
          <Menu className="size-5" strokeWidth={1.75} />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[oklch(0.14_0.01_265/0.55)] data-[state=open]:animate-[scrim-in_320ms_ease-out] data-[state=closed]:animate-[scrim-out_240ms_ease-in-out_forwards]" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-rule bg-panel pt-[env(safe-area-inset-top)] outline-none data-[state=open]:animate-[drawer-in_320ms_cubic-bezier(0.2,0,0,1)] data-[state=closed]:animate-[drawer-out_240ms_cubic-bezier(0.4,0,0.6,1)_forwards]"
          >
            <div className="flex h-16 items-center justify-between pl-5 pr-2">
              <DialogPrimitive.Title asChild>
                <span>
                  <Brand />
                </span>
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className={headerButton} aria-label="Close menu">
                <X className="size-5" strokeWidth={1.75} />
              </DialogPrimitive.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
              <NavigationList onNavigate={onNavigate} />
            </div>
            <div className="border-t border-rule px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              <AccountRows onNavigate={onNavigate} />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <p className="min-w-0 flex-1 truncate px-1 text-[0.9375rem] font-semibold">{currentSectionLabel(pathname)}</p>

      <button type="button" onClick={openSearch} className={headerButton} aria-label="Search">
        <Search className="size-5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={toggleAssistant}
        aria-pressed={assistantOpen}
        aria-label="Assistant"
        className={cn(headerButton, assistantOpen && "bg-tint text-accent")}
      >
        <MessagesSquare className="size-5" strokeWidth={1.75} />
      </button>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {mainNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-[color,opacity] active:opacity-60",
              isActive ? "text-fg" : "text-fg-faint"
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn("size-5", isActive && "text-accent")} strokeWidth={isActive ? 2 : 1.75} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
