import { apiClient } from "./client";
import type { SearchResult } from "@/types";

export function search(query: string) {
  return apiClient
    .get<{ results: SearchResult[] }>("/search", { params: { q: query } })
    .then((r) => r.data.results);
}
