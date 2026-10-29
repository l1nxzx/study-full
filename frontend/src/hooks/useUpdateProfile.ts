import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/api/auth";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string | null) => authApi.updateProfile(name),
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
}
