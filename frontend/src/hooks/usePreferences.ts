import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { applyPreferences, cachePreferences, readCachedPreferences } from "@/lib/preferences";
import type { Preferences, User } from "@/types";

// Account preferences live on the server (so they follow you between devices) and are
// cached locally (so they apply before the first request returns). Updates are optimistic.
export function usePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const preferences: Preferences = { ...readCachedPreferences(), ...(user?.preferences ?? {}) };

  const mutation = useMutation({
    mutationFn: (patch: Preferences) => authApi.updatePreferences(patch),
    onMutate: (patch) => {
      const previous = queryClient.getQueryData<User>(["auth", "me"]);
      const next = { ...preferences, ...patch };
      if (previous) queryClient.setQueryData<User>(["auth", "me"], { ...previous, preferences: next });
      applyPreferences(next);
      cachePreferences(next);
      return { previous };
    },
    onError: (err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["auth", "me"], context.previous);
        const restored = context.previous.preferences ?? {};
        applyPreferences(restored);
        cachePreferences(restored);
      }
      toast({ title: "Couldn't save your preference", description: getErrorMessage(err), variant: "destructive" });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      cachePreferences(updated.preferences ?? {});
    },
  });

  function isTipDismissed(tip: string) {
    return Boolean(preferences.dismissedTips?.includes(tip));
  }

  function dismissTip(tip: string) {
    if (isTipDismissed(tip)) return;
    mutation.mutate({ dismissedTips: [...(preferences.dismissedTips ?? []), tip] });
  }

  return { preferences, updatePreferences: mutation.mutate, isTipDismissed, dismissTip };
}
