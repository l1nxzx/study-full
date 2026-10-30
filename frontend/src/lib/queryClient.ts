import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, type Query } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

// Cached data is kept for a week so the app opens on what you saw last, then refreshes.
const MAX_AGE = 7 * 24 * 60 * 60_000;
const CACHE_KEY = "study.queryCache";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Must outlive the persisted copy, or restored queries are dropped straight away.
      gcTime: MAX_AGE,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// IndexedDB rather than localStorage: notes can outgrow localStorage's few megabytes.
const persister = createAsyncStoragePersister({
  key: CACHE_KEY,
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value: string) => set(key, value),
    removeItem: (key) => del(key),
  },
  throttleTime: 1000,
});

/** Removes the saved copy, so a signed-out device keeps no account data. */
export function clearPersistedCache() {
  return del(CACHE_KEY).catch(() => {});
}

// Search results and server status are only useful live.
const NOT_PERSISTED = new Set(["search", "system"]);

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister,
  maxAge: MAX_AGE,
  // A new deploy can change response shapes, so it starts from a fresh cache.
  buster: import.meta.env.VITE_BUILD_ID ?? "",
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === "success" && !NOT_PERSISTED.has(String(query.queryKey[0])),
  },
};
