import * as DialogPrimitive from "@radix-ui/react-dialog";
import { GraduationCap, LogOut, Menu, Plus, Settings, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { AiHeaderButton } from "@/components/ai-panel/AiToggleButton";
import { SubjectFormDialog } from "@/components/subjects/SubjectFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects } from "@/hooks/useSubjects";
import { mainNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./GlobalSearch";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: subjects } = useSubjects();

  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-3 lg:hidden">
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted">
          <Menu className="size-5" />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col bg-card shadow-lg outline-none">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <span className="text-sm font-semibold">Study</span>
              </div>
              <DialogPrimitive.Close className="flex size-8 items-center justify-center rounded-md hover:bg-muted">
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>

            <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
              <div className="space-y-0.5">
                {mainNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                      )
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between px-2.5 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subjects</p>
                  <SubjectFormDialog
                    trigger={
                      <button className="text-muted-foreground hover:text-foreground" aria-label="New subject">
                        <Plus className="size-3.5" />
                      </button>
                    }
                  />
                </div>
                <div className="space-y-0.5">
                  {subjects?.map((subject) => (
                    <NavLink
                      key={subject.id}
                      to={`/subjects/${subject.id}`}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
                          isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                        )
                      }
                    >
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: subject.color || "#64748b" }} />
                      <span className="truncate">{subject.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </nav>

            <div className="border-t border-border p-3">
              <div className="mb-2 flex items-center gap-2 px-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <NavLink
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <Settings className="size-4" />
                Settings
              </NavLink>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <LogOut className="size-4" />
                Log out
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>
      <AiHeaderButton />
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card lg:hidden">
      {mainNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <item.icon className="size-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
