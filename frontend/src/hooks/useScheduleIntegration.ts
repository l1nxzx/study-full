import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as scheduleIntegrationApi from "@/api/scheduleIntegration";

export function useScheduleIntegrationStatus() {
  return useQuery({
    queryKey: ["scheduleIntegration", "status"],
    queryFn: scheduleIntegrationApi.getStatus,
    staleTime: 60_000,
  });
}

export function useConnectSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (icsUrl: string) => scheduleIntegrationApi.connect(icsUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleIntegration"] });
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });
}

export function useSyncScheduleNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => scheduleIntegrationApi.syncNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleIntegration"] });
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });
}

export function useDisconnectSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => scheduleIntegrationApi.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleIntegration"] });
    },
  });
}
