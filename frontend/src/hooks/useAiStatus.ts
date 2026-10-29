import { useQuery } from "@tanstack/react-query";
import * as systemApi from "@/api/system";

export function useAiStatus() {
  const { data } = useQuery({
    queryKey: ["system", "health"],
    queryFn: systemApi.getHealth,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return data?.aiEnabled ?? false;
}
