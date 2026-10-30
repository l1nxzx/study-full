import { useQuery } from "@tanstack/react-query";
import * as scheduleEventsApi from "@/api/scheduleEvents";

// The school timetable changes rarely (the server syncs it once a day), so it counts as fresh for a
// day: opening pages doesn't fetch it again. "Sync now" and pull to refresh still refetch it at once.
const TIMETABLE_FRESH_MS = 24 * 60 * 60_000;

export function useScheduleEvents(from: string, to: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["scheduleEvents", from, to],
    queryFn: () => scheduleEventsApi.listScheduleEvents(from, to),
    enabled: options.enabled,
    staleTime: TIMETABLE_FRESH_MS,
  });
}
