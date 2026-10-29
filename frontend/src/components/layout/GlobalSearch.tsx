import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckSquare, GraduationCap, NotebookText, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as searchApi from "@/api/search";
import type { SearchResult } from "@/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<SearchResult["type"], typeof Search> = {
  subject: GraduationCap,
  note: NotebookText,
  class_session: CalendarDays,
  task: CheckSquare,
};

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

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: results, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchApi.search(debouncedQuery),
    enabled: debouncedQuery.trim().length > 1,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = open && query.trim().length > 1;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search..."
          className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-80 w-72 overflow-y-auto rounded-md border border-border bg-card shadow-md">
          {isFetching && <p className="px-3 py-3 text-xs text-muted-foreground">Searching...</p>}
          {!isFetching && results?.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">No results for "{query}"</p>
          )}
          {!isFetching &&
            results?.map((result) => {
              const Icon = TYPE_ICON[result.type];
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    navigate(resultPath(result));
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                  )}
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{result.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {TYPE_LABEL[result.type]}
                      {result.subtitle ? ` · ${result.subtitle}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
