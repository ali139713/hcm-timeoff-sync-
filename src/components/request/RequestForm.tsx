"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RollbackNotice } from "./RollbackNotice";
import { useTimeOffRequest } from "@/hooks/useTimeOffRequest";
import { useUIStore } from "@/lib/store/ui";
import { useBalances } from "@/hooks/useBalances";
import { EMPLOYEES, LOCATIONS } from "@/lib/hcm/fixtures";
import type { LeaveType } from "@/types";

const today = new Date().toISOString().split("T")[0];

const schema = z
  .object({
    locationId: z.string().min(1, "Select a location"),
    leaveType: z.enum(["annual", "sick", "personal"]),
    days: z.coerce.number().int().min(1, "At least 1 day").max(365),
    startDate: z.string().min(1, "Required").refine(
      (d) => d >= today,
      "Start date cannot be in the past"
    ),
    endDate: z.string().min(1, "Required"),
    note: z.string().max(500).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  employeeId: string;
}

export function RequestForm({ employeeId }: Props) {
  const { requestModalOpen, submissionStep, savedDraft, openRequestModal, closeRequestModal, resetSubmission } =
    useUIStore();
  const { submit, isPending } = useTimeOffRequest();
  const { balances } = useBalances(employeeId);

  const employee = EMPLOYEES.find((e) => e.id === employeeId);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      locationId: employee?.locationIds[0] ?? "",
      leaveType: "annual",
      days: 1,
    },
  });

  // Restore draft after rollback
  useEffect(() => {
    if (savedDraft && submissionStep === "rolled_back") {
      reset({
        locationId: savedDraft.locationId,
        leaveType: savedDraft.leaveType as LeaveType,
        days: savedDraft.days,
        startDate: savedDraft.startDate,
        endDate: savedDraft.endDate,
        note: savedDraft.note,
      });
    }
  }, [savedDraft, submissionStep, reset]);

  const watchedLocation = useWatch({ control, name: "locationId" }) ?? "";
  const watchedLeaveType = useWatch({ control, name: "leaveType" });
  const watchedStartDate = useWatch({ control, name: "startDate" });

  const relevantBalance = balances.find(
    (b) =>
      b.locationId === watchedLocation && b.leaveType === watchedLeaveType
  );

  function onSubmit(values: FormValues) {
    if (relevantBalance && values.days > relevantBalance.available) {
      setError("days", {
        type: "manual",
        message: `Only ${relevantBalance.available} day${relevantBalance.available === 1 ? "" : "s"} available`,
      });
      return;
    }
    submit({
      employeeId,
      locationId: values.locationId,
      leaveType: values.leaveType,
      days: values.days,
      startDate: values.startDate,
      endDate: values.endDate,
      note: values.note,
    });
  }

  function handleClose() {
    closeRequestModal();
    resetSubmission();
    reset();
  }

  return (
    <>
      <Button onClick={openRequestModal}>Request time off</Button>

      <Dialog open={requestModalOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>

          {submissionStep === "confirmed" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-medium">Request submitted</p>
              <p className="text-sm text-gray-500">
                Your request is pending HCM confirmation. You&apos;ll see the
                final status once it&apos;s processed.
              </p>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {submissionStep === "rolled_back" && (
                <RollbackNotice onRetry={() => resetSubmission()} />
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">Location</label>
                <Select
                  value={watchedLocation || ""}
                  onValueChange={(v: string | null) => setValue("locationId", v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employee?.locationIds ?? []).map((id) => {
                      const loc = LOCATIONS.find((l) => l.id === id);
                      return (
                        <SelectItem key={id} value={id}>
                          {loc?.name ?? id}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.locationId && (
                  <p className="text-xs text-red-600">{errors.locationId.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Leave type</label>
                <Select
                  value={watchedLeaveType}
                  onValueChange={(v: string | null) => setValue("leaveType", (v ?? "annual") as LeaveType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {relevantBalance !== undefined && (
                <p className="text-xs text-gray-500">
                  Available:{" "}
                  <strong>{relevantBalance.available} days</strong>
                </p>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">Days requested</label>
                <input
                  type="number"
                  min={1}
                  max={relevantBalance?.available ?? 365}
                  {...register("days")}
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                {errors.days && (
                  <p className="text-xs text-red-600">{errors.days.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Start date</label>
                  <input
                    type="date"
                    min={today}
                    {...register("startDate")}
                    className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  {errors.startDate && (
                    <p className="text-xs text-red-600">{errors.startDate.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">End date</label>
                  <input
                    type="date"
                    min={watchedStartDate || today}
                    {...register("endDate")}
                    className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  {errors.endDate && (
                    <p className="text-xs text-red-600">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Note{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  {...register("note")}
                  rows={2}
                  className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || submissionStep === "pending_hcm"}
                >
                  {isPending || submissionStep === "pending_hcm" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit request"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
