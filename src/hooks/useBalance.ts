"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBalance } from "@/lib/hcm/client";
import { keys } from "@/lib/query-client";
import type { Balance, LeaveType } from "@/types";

interface UseBalanceResult {
  balance: Balance | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

// staleTime 0 + disabled by default: this is the authoritative read,
// fetched on demand only (post-mutation, manager approval), never polled
export function useBalance(
  employeeId: string,
  locationId: string,
  leaveType: LeaveType,
  options: { enabled?: boolean } = {}
): UseBalanceResult {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: keys.balance(employeeId, locationId, leaveType),
    queryFn: () => fetchBalance(employeeId, locationId, leaveType),
    staleTime: 0,
    enabled: options.enabled ?? false,
  });

  return { balance: data, isLoading, isError, refetch };
}

export function useFetchBalanceOnDemand() {
  const queryClient = useQueryClient();

  return async (
    employeeId: string,
    locationId: string,
    leaveType: LeaveType
  ): Promise<Balance | undefined> => {
    return queryClient.fetchQuery({
      queryKey: keys.balance(employeeId, locationId, leaveType),
      queryFn: () => fetchBalance(employeeId, locationId, leaveType),
      staleTime: 0,
    });
  };
}
