export type LeaveType = "annual" | "sick" | "personal";

export type RequestStatus =
  | "pending_hcm"
  | "approved"
  | "denied"
  | "rolled_back";

export type SimMode =
  | "normal"
  | "silent_fail"
  | "conflict"
  | "slow"
  | "anniversary";

export interface Balance {
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  available: number;
  pending: number;
  unit: "days";
  fetchedAt: string;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  locationId: string;
  leaveType: LeaveType;
  days: number;
  startDate: string;
  endDate: string;
  note?: string;
  status: RequestStatus;
  submittedAt: string;
  resolvedAt?: string;
}

export interface HCMError {
  code: "INSUFFICIENT_BALANCE" | "INVALID_DIMENSION" | "UNKNOWN";
  message: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  locationIds: string[];
  managerId?: string;
}

export interface Location {
  id: string;
  name: string;
  country: string;
}

export interface SimTriggerPayload {
  mode: SimMode;
  employeeId?: string;
  locationId?: string;
}
