"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBalances } from "@/lib/hcm/client";
import { keys } from "@/lib/query-client";
import type { Balance } from "@/types";

interface UseBalancesResult {
  balances: Balance[];
  isLoading: boolean;
  isError: boolean;
  isStale: boolean;
  error: unknown;
}

export function useBalances(employeeId: string): UseBalancesResult {
  const { data, isLoading, isError, isStale, error } = useQuery({
    queryKey: keys.balances(employeeId),
    queryFn: () => fetchBalances(employeeId),
    enabled: Boolean(employeeId),
  });

  return {
    balances: data?.balances ?? [],
    isLoading,
    isError,
    isStale,
    error,
  };
}
