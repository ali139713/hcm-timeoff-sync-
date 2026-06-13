"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitRequest } from "@/lib/hcm/client";
import { keys } from "@/lib/query-client";
import { classifyHCMError } from "@/lib/errors";
import { useUIStore } from "@/lib/store/ui";
import { useFetchBalanceOnDemand } from "./useBalance";
import type { Balance, LeaveType, TimeOffRequest } from "@/types";

interface SubmitPayload {
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

const classifyError = classifyHCMError;

export function useTimeOffRequest() {
  const queryClient = useQueryClient();
  const { setSubmissionStep, setConfirmedRequest, setRollback } = useUIStore();
  const fetchBalanceOnDemand = useFetchBalanceOnDemand();

  const mutation = useMutation({
    mutationFn: submitRequest,

    onMutate: async (payload: SubmitPayload) => {
      setSubmissionStep("submitting");

      // a background refetch resolving mid-flight would overwrite the optimistic update
      await queryClient.cancelQueries({
        queryKey: keys.balances(payload.employeeId),
      });

      const snapshot = queryClient.getQueryData<CacheSnapshot>(
        keys.balances(payload.employeeId)
      );

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
      // re-read the cell from HCM — a 200 doesn't guarantee the deduction happened
      const fresh = await fetchBalanceOnDemand(
        vars.employeeId,
        vars.locationId,
        vars.leaveType
      );

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
