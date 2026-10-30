import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useCloseOnBack } from "@/lib/closeOnBack";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as searchApi from "@/api/search";
import { Kbd } from "@/components/ui/kbd";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useShell } from "@/hooks/useShell";
import { BarColor, SCRIM } from "@/lib/themeColor";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types";

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  subject: "Subject",
  note: "Note",
  class_session: "Class session",
  task: "Task",
};

function resultPath(result: SearchResult): string {
  switch (result.type) {
    case "subject":
      return `/subjects/${result.id}`;
    case "note":
      return `/notes/${result.id}`;
    case "class_session":
      return `/class-sessions/${result.id}`;
    case "task":
      return "/tasks";
  }
}

// A search palette: one input at the top of the screen, results underneath, fully usable from
// the keyboard (arrows + Enter). Opened from the sidebar, the phone header, or Ctrl/Cmd+K.
export function SearchDialog() {
  const { searchOpen, setSearchOpen } = useShell();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 200);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

  const enabled = debouncedQuery.trim().length > 1;
  const { data: results, isFetching, isError } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchApi.search(debouncedQuery),
    enabled,
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchOpen]);

  function close(open: boolean) {
    setSearchOpen(open);
    if (!open) setQuery("");
  }
  useCloseOnBack(searchOpen, () => close(false));

  function go(result: SearchResult) {
    navigate(resultPath(result));
    close(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!results?.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) go(result);
    }
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const showResults = enabled && results !== undefined;

  return (
    <DialogPrimitive.Root open={searchOpen} onOpenChange={close}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[oklch(0.14_0.01_265/0.55)]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col border-b border-rule bg-raised shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:top-[12vh] sm:max-h-[70vh] sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:rounded-lg sm:border"
        >
          <BarColor layers={() => (window.matchMedia("(min-width: 640px)").matches ? [SCRIM] : ["--color-raised"])} />
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-rule px-4 pt-[env(safe-area-inset-top)]">
            <Search className="size-4 shrink-0 text-fg-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search notes, subjects, tasks..."
              className="h-14 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-fg placeholder:text-fg-faint focus:outline-none"
              aria-controls="search-results"
            />
            <DialogPrimitive.Close className="text-[0.8125rem] text-fg-muted hover:text-fg sm:hidden">Cancel</DialogPrimitive.Close>
            <Kbd className="hidden sm:inline-flex">Esc</Kbd>
          </div>

          <div ref={listRef} id="search-results" role="listbox" className="overflow-y-auto overscroll-y-contain">
            {!enabled && <p className="px-4 py-4 text-[0.8125rem] text-fg-faint">Type at least two characters.</p>}
            {enabled && isFetching && !results && <p className="px-4 py-4 text-[0.8125rem] text-fg-faint">Searching...</p>}
            {enabled && isError && <p className="px-4 py-4 text-[0.8125rem] text-bad">Search isn't available right now.</p>}
            {showResults && results.length === 0 && (
              <p className="px-4 py-4 text-[0.8125rem] text-fg-muted">Nothing matches "{debouncedQuery}".</p>
            )}
            {showResults && results.length > 0 && (
              <ul className="py-1.5">
                {results.map((result, i) => (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      data-index={i}
                      onMouseMove={() => setActiveIndex(i)}
                      onClick={() => go(result)}
                      className={cn(
                        "flex w-full items-baseline gap-3 px-4 py-2.5 text-left",
                        i === activeIndex ? "bg-tint" : "hover:bg-tint/60"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{result.title}</span>
                        {result.subtitle && <span className="block truncate text-meta text-fg-muted">{result.subtitle}</span>}
                      </span>
                      <span className="shrink-0 text-meta text-fg-faint">{TYPE_LABEL[result.type]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
