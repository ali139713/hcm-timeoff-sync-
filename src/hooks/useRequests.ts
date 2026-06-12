"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRequests, resolveRequest } from "@/lib/hcm/client";
import { keys } from "@/lib/query-client";
import type { TimeOffRequest } from "@/types";

export function useRequests() {
  const { data, isLoading, isError } = useQuery({
    queryKey: keys.allRequests,
    queryFn: fetchRequests,
    staleTime: 15_000,
  });

  return {
    requests: data?.requests ?? [],
    isLoading,
    isError,
  };
}

export function useResolveRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      requestId,
      action,
    }: {
      requestId: string;
      action: "approve" | "deny";
    }) => resolveRequest(requestId, action),

    onMutate: async ({ requestId, action }) => {
      await queryClient.cancelQueries({ queryKey: keys.allRequests });

      const snapshot = queryClient.getQueryData<{ requests: TimeOffRequest[] }>(
        keys.allRequests
      );

      queryClient.setQueryData<{ requests: TimeOffRequest[] }>(
        keys.allRequests,
        (old) => {
          if (!old) return old;
          return {
            requests: old.requests.map((r) =>
              r.id === requestId
                ? {
                    ...r,
                    status: action === "approve" ? "approved" : "denied",
                    resolvedAt: new Date().toISOString(),
                  }
                : r
            ),
          };
        }
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(keys.allRequests, context.snapshot);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.allRequests });
    },
  });

  return {
    resolve: mutation.mutate,
    isPending: mutation.isPending,
  };
}
