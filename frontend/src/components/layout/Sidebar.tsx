import { ChartNoAxesColumn, ChevronDown, LogOut, MessagesSquare, Pin, Plus, Search, Settings } from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { usePressMenu } from "@/components/shared/PressMenu";
import { SubjectFormDialog } from "@/components/subjects/SubjectFormDialog";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { Kbd } from "@/components/ui/kbd";
import { useAiPanel } from "@/hooks/useAiPanel";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import { useShell } from "@/hooks/useShell";
import { useSubjects } from "@/hooks/useSubjects";
import { mainNavItems } from "@/lib/nav";
import { modKey } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types";

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
        <SubjectList subjects={subjects} onNavigate={onNavigate} />
      </div>
    </>
  );
}

const DEFAULT_SUBJECT_COUNT = 6;

function SubjectRow({
  subject,
  pinned,
  canMoveUp,
  canMoveDown,
  onNavigate,
  onPin,
  onMove,
}: {
  subject: Subject;
  pinned: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onNavigate?: () => void;
  onPin: (pin: boolean) => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const navigate = useNavigate();
  const { handlers, menu } = usePressMenu([
    {
      label: "Open",
      onSelect: () => {
        navigate(`/subjects/${subject.id}`);
        onNavigate?.();
      },
    },
    { label: pinned ? "Unpin" : "Pin to the top", onSelect: () => onPin(!pinned) },
    pinned && canMoveUp && { label: "Move up", onSelect: () => onMove(-1) },
    pinned && canMoveDown && { label: "Move down", onSelect: () => onMove(1) },
  ]);
  return (
    <>
      <NavLink
        to={`/subjects/${subject.id}`}
        onClick={onNavigate}
        className={({ isActive }) => cn(navRowClasses(isActive), "select-none [-webkit-touch-callout:none]")}
        {...handlers}
      >
        <span className="flex size-4 items-center justify-center">
          <SubjectSwatch color={subject.color} />
        </span>
        <span className="flex-1 truncate">{subject.name}</span>
        {pinned && <Pin className="size-3 shrink-0 text-fg-faint" aria-label="Pinned" />}
      </NavLink>
      {menu}
    </>
  );
}

/**
 * Subjects in the sidebar: pinned ones first, in the order chosen, then the rest. Only the
 * first few show (a preference) - the rest behind "Show more"; the open subject always shows.
 * Right-click or long-press a subject to pin it or move it.
 */
function SubjectList({ subjects, onNavigate }: { subjects: Subject[] | undefined; onNavigate?: () => void }) {
  const { preferences, updatePreferences } = usePreferences();
  const [expanded, setExpanded] = useState(false);
  const { pathname } = useLocation();
  if (!subjects) return null;
  if (subjects.length === 0) return <p className="px-2.5 py-1 text-[0.8125rem] text-fg-faint">No subjects yet.</p>;

  const byId = new Map(subjects.map((s) => [s.id, s]));
  const pinnedIds = (preferences.pinnedSubjects ?? []).filter((id) => byId.has(id));
  const ordered = [...pinnedIds.map((id) => byId.get(id)!), ...subjects.filter((s) => !pinnedIds.includes(s.id))];
  const limit = preferences.sidebarSubjectCount ?? DEFAULT_SUBJECT_COUNT;
  const shownCount = limit === 0 ? ordered.length : Math.max(limit, pinnedIds.length);
  const activeId = pathname.match(/^\/subjects\/([^/]+)/)?.[1];
  const visible = expanded ? ordered : ordered.filter((s, i) => i < shownCount || s.id === activeId);
  const hidden = ordered.length - visible.length;

  function setPinned(next: string[]) {
    updatePreferences({ pinnedSubjects: next });
  }

  return (
    <div className="space-y-px">
      {visible.map((subject) => {
        const index = pinnedIds.indexOf(subject.id);
        return (
          <SubjectRow
            key={subject.id}
            subject={subject}
            pinned={index !== -1}
            canMoveUp={index > 0}
            canMoveDown={index !== -1 && index < pinnedIds.length - 1}
            onNavigate={onNavigate}
            onPin={(pin) => setPinned(pin ? [...pinnedIds, subject.id] : pinnedIds.filter((id) => id !== subject.id))}
            onMove={(delta) => {
              const next = [...pinnedIds];
              next.splice(index, 1);
              next.splice(index + delta, 0, subject.id);
              setPinned(next);
            }}
          />
        );
      })}
      {(hidden > 0 || expanded) && ordered.length > shownCount && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[0.8125rem] text-fg-faint transition-colors hover:bg-tint/60 hover:text-fg lg:h-7"
        >
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} strokeWidth={1.75} />
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}

export function AccountRows({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <div className="space-y-px">
      <NavLink to="/profile" onClick={onNavigate} className={({ isActive }) => navRowClasses(isActive)}>
        {({ isActive }) => (
          <>
            <ChartNoAxesColumn className={navIconClasses(isActive)} strokeWidth={1.75} />
            Profile and statistics
          </>
        )}
      </NavLink>
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
/** The app's mark and name. */
export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="size-7 rounded-md" />
      <span className="text-lg font-semibold tracking-[-0.015em] text-fg">Study</span>
    </span>
  );
}

export function Sidebar() {
  const { openSearch } = useShell();
  const { isOpen: assistantOpen, toggle: toggleAssistant } = useAiPanel();

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-rule bg-panel lg:flex">
      <div className="flex h-16 items-center px-5">
        <Brand />
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
