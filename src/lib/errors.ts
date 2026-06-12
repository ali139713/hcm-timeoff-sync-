import type { HCMError } from "@/types";

export function classifyHCMError(error: unknown): string {
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

export function isHCMConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as HCMError).code !== "UNKNOWN"
  );
}
