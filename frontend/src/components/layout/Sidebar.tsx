import { GraduationCap, LogOut, Plus, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { SubjectFormDialog } from "@/components/subjects/SubjectFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { useSubjects } from "@/hooks/useSubjects";
import { mainNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./GlobalSearch";

function NavItemLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof GraduationCap }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
          isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { data: subjects } = useSubjects();

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="size-4" />
        </div>
        <span className="text-sm font-semibold">Study</span>
      </div>

      <div className="border-b border-border p-3">
        <GlobalSearch />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {mainNavItems.map((item) => (
            <NavItemLink key={item.to} {...item} />
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
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color || "#64748b" }}
                />
                <span className="truncate">{subject.name}</span>
              </NavLink>
            ))}
            {subjects?.length === 0 && (
              <p className="px-2.5 py-1 text-xs text-muted-foreground">No subjects yet</p>
            )}
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
        <NavItemLink to="/settings" label="Settings" icon={Settings} />
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
