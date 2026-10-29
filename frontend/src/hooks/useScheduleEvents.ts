import { useQuery } from "@tanstack/react-query";
import * as scheduleEventsApi from "@/api/scheduleEvents";

export function useScheduleEvents(from: string, to: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["scheduleEvents", from, to],
    queryFn: () => scheduleEventsApi.listScheduleEvents(from, to),
    enabled: options.enabled,
  });
}
