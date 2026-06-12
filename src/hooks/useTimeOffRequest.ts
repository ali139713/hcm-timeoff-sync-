"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitRequest } from "@/lib/hcm/client";
import { keys } from "@/lib/query-client";
import { useUIStore } from "@/lib/store/ui";
import { useFetchBalanceOnDemand } from "./useBalance";
import type { Balance, HCMError, LeaveType, TimeOffRequest } from "@/types";

interface SubmitPayload {
  id: string;
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  days: number;
  startDate: string;
  endDate: string;
  note?: string;
}

interface CacheSnapshot {
  balances: Balance[];
}

function classifyError(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Couldn't reach the HR system. Please try again.";
  }
  const hcmError = error as HCMError;
  if (hcmError.code === "INSUFFICIENT_BALANCE") {
    return "You don't have enough days available for this request.";
  }
  if (hcmError.code === "INVALID_DIMENSION") {
    return "This location and leave type combination isn't valid for your account.";
  }
  return "Couldn't reach the HR system. Please try again.";
}

export function useTimeOffRequest() {
  const queryClient = useQueryClient();
  const { setSubmissionStep, setConfirmedRequest, setRollback } = useUIStore();
  const fetchBalanceOnDemand = useFetchBalanceOnDemand();

  const mutation = useMutation({
    mutationFn: submitRequest,

    onMutate: async (payload: SubmitPayload) => {
      setSubmissionStep("submitting");

      // Cancel any in-flight background refetches for this employee's balances
      // so they don't overwrite the optimistic update mid-flight
      await queryClient.cancelQueries({
        queryKey: keys.balances(payload.employeeId),
      });

      const snapshot = queryClient.getQueryData<CacheSnapshot>(
        keys.balances(payload.employeeId)
      );

      // Optimistically deduct — show as tentative (pending), not approved
      queryClient.setQueryData<CacheSnapshot>(
        keys.balances(payload.employeeId),
        (old) => {
          if (!old) return old;
          return {
            balances: old.balances.map((b) =>
              b.locationId === payload.locationId &&
              b.leaveType === payload.leaveType
                ? {
                    ...b,
                    available: b.available - payload.days,
                    pending: b.pending + payload.days,
                  }
                : b
            ),
          };
        }
      );

      setSubmissionStep("pending_hcm");
      return { snapshot, payload };
    },

    onError: (
      error: unknown,
      _vars: SubmitPayload,
      context: { snapshot: CacheSnapshot | undefined; payload: SubmitPayload } | undefined
    ) => {
      // Rollback the optimistic update — restore the snapshot
      if (context?.snapshot) {
        queryClient.setQueryData(
          keys.balances(context.payload.employeeId),
          context.snapshot
        );
      }

      setRollback(classifyError(error), {
        locationId: context?.payload.locationId ?? "",
        leaveType: context?.payload.leaveType ?? "annual",
        days: context?.payload.days ?? 0,
        startDate: context?.payload.startDate ?? "",
        endDate: context?.payload.endDate ?? "",
        note: context?.payload.note,
      });
    },

    onSuccess: (data: { request: TimeOffRequest }) => {
      setConfirmedRequest(data.request);
    },

    onSettled: async (
      _data: { request: TimeOffRequest } | undefined,
      _error: unknown,
      vars: SubmitPayload
    ) => {
      // Always fetch the authoritative balance after mutation settles.
      // This catches silent failures: HCM returned 200 but didn't actually deduct.
      const fresh = await fetchBalanceOnDemand(
        vars.employeeId,
        vars.locationId,
        vars.leaveType
      );

      // Update the batch cache with the authoritative value for this cell
      if (fresh) {
        queryClient.setQueryData<CacheSnapshot>(
          keys.balances(vars.employeeId),
          (old) => {
            if (!old) return old;
            return {
              balances: old.balances.map((b) =>
                b.locationId === vars.locationId &&
                b.leaveType === vars.leaveType
                  ? { ...fresh }
                  : b
              ),
            };
          }
        );
      }

      // Invalidate the full batch so background renders stay fresh
      queryClient.invalidateQueries({
        queryKey: keys.balances(vars.employeeId),
      });
    },
  });

  return {
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
