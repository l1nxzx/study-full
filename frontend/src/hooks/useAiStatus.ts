import { useQuery } from "@tanstack/react-query";
import * as systemApi from "@/api/system";

// `undefined` while the health check is still loading, so callers don't flash an
// "AI unavailable" message before they know.
export function useAiStatus(): boolean | undefined {
  const { data, isError } = useQuery({
    queryKey: ["system", "health"],
    queryFn: systemApi.getHealth,
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (isError) return false;
  return data?.aiEnabled;
}
