import type { Balance, SimMode, TimeOffRequest } from "@/types";
import { SEED_BALANCES, SEED_REQUESTS } from "./fixtures";

// In-memory HCM state — reset via POST /api/hcm/sim with {"mode": "reset"}
let balances: Balance[] = structuredClone(SEED_BALANCES);
let requests: TimeOffRequest[] = structuredClone(SEED_REQUESTS);
let currentMode: SimMode = "normal";
let modeEmployeeId: string | undefined;

export function getSimMode() {
  return { mode: currentMode, employeeId: modeEmployeeId };
}

export function setSimMode(mode: SimMode, employeeId?: string) {
  currentMode = mode;
  modeEmployeeId = employeeId;
}

export function resetSim() {
  balances = structuredClone(SEED_BALANCES);
  requests = structuredClone(SEED_REQUESTS);
  currentMode = "normal";
  modeEmployeeId = undefined;
}

export function getBalance(
  employeeId: string,
  locationId: string,
  leaveType: string
): Balance | undefined {
  return balances.find(
    (b) =>
      b.employeeId === employeeId &&
      b.locationId === locationId &&
      b.leaveType === leaveType
  );
}

export function getBalancesForEmployee(employeeId: string): Balance[] {
  return balances.filter((b) => b.employeeId === employeeId);
}

export function deductBalance(
  employeeId: string,
  locationId: string,
  leaveType: string,
  days: number
): boolean {
  const balance = getBalance(employeeId, locationId, leaveType);
  if (!balance || balance.available < days) return false;
  balance.available -= days;
  balance.pending += days;
  balance.fetchedAt = new Date().toISOString();
  return true;
}

export function resolveRequest(requestId: string, approved: boolean) {
  const req = requests.find((r) => r.id === requestId);
  if (!req) return;

  req.status = approved ? "approved" : "denied";
  req.resolvedAt = new Date().toISOString();

  if (!approved) {
    // return days to available on denial
    const balance = getBalance(req.employeeId, req.locationId, req.leaveType);
    if (balance) {
      balance.available += req.days;
      balance.pending = Math.max(0, balance.pending - req.days);
      balance.fetchedAt = new Date().toISOString();
    }
  } else {
    const balance = getBalance(req.employeeId, req.locationId, req.leaveType);
    if (balance) {
      balance.pending = Math.max(0, balance.pending - req.days);
      balance.fetchedAt = new Date().toISOString();
    }
  }
}

export function triggerAnniversaryBonus(employeeId: string) {
  balances
    .filter((b) => b.employeeId === employeeId && b.leaveType === "annual")
    .forEach((b) => {
      b.available += 5;
      b.fetchedAt = new Date().toISOString();
    });
}

export function addRequest(req: TimeOffRequest) {
  requests.push(req);
}

export function getAllRequests(): TimeOffRequest[] {
  return requests;
}
