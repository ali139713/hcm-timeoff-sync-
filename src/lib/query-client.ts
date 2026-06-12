import { QueryClient } from "@tanstack/react-query";
import { isHCMConflict } from "@/lib/errors";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        // Don't retry on HCM 4xx — conflict errors won't resolve with retries
        retry: (failureCount, error) => {
          if (isHCMConflict(error)) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Shared cache keys — centralised so typos don't create phantom cache entries
export const keys = {
  balances: (employeeId: string) => ["balances", employeeId] as const,
  balance: (employeeId: string, locationId: string, leaveType: string) =>
    ["balance", employeeId, locationId, leaveType] as const,
  allRequests: ["requests", "all"] as const,
};
