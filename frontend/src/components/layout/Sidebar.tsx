import { LogOut, MessagesSquare, Plus, Search, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { SubjectFormDialog } from "@/components/subjects/SubjectFormDialog";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { Kbd } from "@/components/ui/kbd";
import { useAiPanel } from "@/hooks/useAiPanel";
import { useAuth } from "@/hooks/useAuth";
import { useShell } from "@/hooks/useShell";
import { useSubjects } from "@/hooks/useSubjects";
import { mainNavItems } from "@/lib/nav";
import { modKey } from "@/lib/platform";
import { cn } from "@/lib/utils";

const navRowClasses = (active: boolean) =>
  cn(
    "group flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors lg:h-8",
    active ? "bg-tint font-medium text-fg" : "text-fg-muted hover:bg-tint/60 hover:text-fg"
  );

const navIconClasses = (active: boolean) =>
  cn("size-4 shrink-0", active ? "text-accent" : "text-fg-faint group-hover:text-fg-muted");

/** Sections, then subjects, then the assistant. Shared by the desktop sidebar and phone drawer. */
export function NavigationList({ onNavigate }: { onNavigate?: () => void }) {
  const { data: subjects } = useSubjects();

  return (
    <>
      <nav aria-label="Sections" className="space-y-px">
        {mainNavItems.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => navRowClasses(isActive)}>
            {({ isActive }) => (
              <>
                <item.icon className={navIconClasses(isActive)} strokeWidth={1.75} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-7">
        <div className="mb-1 flex h-6 items-center justify-between pl-2.5">
          <p className="group-label">Subjects</p>
          <SubjectFormDialog
            trigger={
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-sm text-fg-faint transition-colors hover:bg-tint hover:text-fg lg:size-6"
                aria-label="New subject"
                title="New subject"
              >
                <Plus className="size-3.5" />
              </button>
            }
          />
        </div>
        <div className="space-y-px">
          {subjects?.map((subject) => (
            <NavLink
              key={subject.id}
              to={`/subjects/${subject.id}`}
              onClick={onNavigate}
              className={({ isActive }) => navRowClasses(isActive)}
            >
              <span className="flex size-4 items-center justify-center">
                <SubjectSwatch color={subject.color} />
              </span>
              <span className="truncate">{subject.name}</span>
            </NavLink>
          ))}
          {subjects?.length === 0 && <p className="px-2.5 py-1 text-[0.8125rem] text-fg-faint">No subjects yet.</p>}
        </div>
      </div>
    </>
  );
}

export function AccountRows({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <div className="space-y-px">
      <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => navRowClasses(isActive)}>
        {({ isActive }) => (
          <>
            <Settings className={navIconClasses(isActive)} strokeWidth={1.75} />
            Settings
          </>
        )}
      </NavLink>
      <div className="flex items-center gap-2 pl-2.5">
        <span className="min-w-0 flex-1 truncate text-meta text-fg-faint" title={user?.email}>
          {user?.name || user?.email}
        </span>
        <button
          type="button"
          onClick={logout}
          title="Log out"
          aria-label="Log out"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-tint hover:text-fg"
        >
          <LogOut className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

/** Desktop navigation: narrow, quiet, always there. */
export function Sidebar() {
  const { openSearch } = useShell();
  const { isOpen: assistantOpen, toggle: toggleAssistant } = useAiPanel();

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-rule bg-panel lg:flex">
      <div className="flex h-16 items-center px-5">
        <span className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-fg">Study</span>
      </div>

      <div className="space-y-px px-3">
        <button
          type="button"
          onClick={openSearch}
          className="flex h-8 w-full items-center gap-2.5 rounded-md border border-rule px-2.5 text-sm text-fg-faint transition-colors hover:border-rule-strong hover:text-fg-muted"
        >
          <Search className="size-4" strokeWidth={1.75} />
          <span className="flex-1 text-left">Search</span>
          <Kbd>{modKey} K</Kbd>
        </button>
        <button
          type="button"
          onClick={toggleAssistant}
          aria-pressed={assistantOpen}
          className={cn(navRowClasses(assistantOpen), "mt-1 w-full")}
        >
          <MessagesSquare className={navIconClasses(assistantOpen)} strokeWidth={1.75} />
          <span className="flex-1 text-left">Assistant</span>
          <Kbd>{modKey} J</Kbd>
        </button>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
        <NavigationList />
      </div>

      <div className="border-t border-rule px-3 py-3">
        <AccountRows />
      </div>
    </aside>
  );
}
