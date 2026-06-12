"use client";

import { useEffect, useRef } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { keys } from "@/lib/query-client";
import { useUIStore } from "@/lib/store/ui";
import type { Balance } from "@/types";

// Watches for balance changes that arrive from outside (anniversary bonus,
// year reset, manager adjustment). If the fetched value differs from what
// the cache shows, surfaces a StaleBanner for the affected row.
// Crucially, this does nothing while a mutation is in-flight to avoid
// stomping on optimistic state.
export function useReconcile(employeeId: string) {
  const queryClient = useQueryClient();
  const isMutating = useIsMutating();
  const { dismissedStaleBanners, clearDismissedBanners } = useUIStore();
  const previousBalancesRef = useRef<Balance[] | null>(null);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type !== "updated" ||
        isMutating > 0
      ) {
        return;
      }

      const queryKey = event.query.queryKey;
      if (
        !Array.isArray(queryKey) ||
        queryKey[0] !== "balances" ||
        queryKey[1] !== employeeId
      ) {
        return;
      }

      const current = event.query.state.data as
        | { balances: Balance[] }
        | undefined;
      const previous = previousBalancesRef.current;

      if (!current || !previous) {
        previousBalancesRef.current = current?.balances ?? null;
        return;
      }

      // Check each balance for external changes
      for (const fresh of current.balances) {
        const stale = previous.find(
          (b) =>
            b.locationId === fresh.locationId &&
            b.leaveType === fresh.leaveType
        );

        if (stale && stale.available !== fresh.available) {
          const bannerKey = `${employeeId}:${fresh.locationId}:${fresh.leaveType}`;
          // Only surface if the user hasn't already dismissed this banner
          if (!dismissedStaleBanners.has(bannerKey)) {
            // The StaleBanner component reads directly from the query cache,
            // so we just need to clear any previous dismissals for this key
            // to make it visible again
            clearDismissedBanners();
          }
        }
      }

      previousBalancesRef.current = current.balances;
    });

    return () => unsubscribe();
  }, [queryClient, employeeId, isMutating, dismissedStaleBanners, clearDismissedBanners]);
}
