import type {
  Balance,
  HCMError,
  LeaveType,
  SimMode,
  TimeOffRequest,
} from "@/types";

const BASE = "/api/hcm";

async function hcmFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: HCMError = {
      code: body.code ?? "UNKNOWN",
      message: body.error ?? "HCM request failed",
    };
    throw err;
  }

  return res.json() as Promise<T>;
}

export async function fetchBalance(
  employeeId: string,
  locationId: string,
  leaveType: LeaveType
): Promise<Balance> {
  const params = new URLSearchParams({ employeeId, locationId, leaveType });
  return hcmFetch<Balance>(`/balance?${params}`);
}

export async function fetchBalances(
  employeeId: string
): Promise<{ balances: Balance[] }> {
  const params = new URLSearchParams({ employeeId });
  return hcmFetch<{ balances: Balance[] }>(`/balances?${params}`);
}

export async function submitRequest(
  payload: Omit<TimeOffRequest, "status" | "submittedAt" | "resolvedAt">
): Promise<{ request: TimeOffRequest }> {
  return hcmFetch<{ request: TimeOffRequest }>("/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resolveRequest(
  requestId: string,
  action: "approve" | "deny"
): Promise<{ ok: boolean }> {
  return hcmFetch<{ ok: boolean }>("/requests", {
    method: "PATCH",
    body: JSON.stringify({ requestId, action }),
  });
}

export async function fetchRequests(): Promise<{
  requests: TimeOffRequest[];
}> {
  return hcmFetch<{ requests: TimeOffRequest[] }>("/requests");
}

export async function triggerSim(payload: {
  mode: SimMode | "reset";
  employeeId?: string;
}): Promise<{ ok: boolean; mode: string }> {
  return hcmFetch<{ ok: boolean; mode: string }>("/_sim", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
