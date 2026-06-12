import type { Balance, Employee, Location, TimeOffRequest } from "@/types";

export const LOCATIONS: Location[] = [
  { id: "loc_nyc", name: "New York", country: "US" },
  { id: "loc_lon", name: "London", country: "UK" },
];

export const EMPLOYEES: Employee[] = [
  {
    id: "emp_1",
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    locationIds: ["loc_nyc"],
    managerId: "emp_3",
  },
  {
    id: "emp_2",
    name: "James Okafor",
    email: "james.okafor@example.com",
    locationIds: ["loc_lon"],
    managerId: "emp_3",
  },
  {
    id: "emp_3",
    name: "Maria Santos",
    email: "maria.santos@example.com",
    locationIds: ["loc_nyc", "loc_lon"],
  },
];

export const SEED_BALANCES: Balance[] = [
  {
    employeeId: "emp_1",
    locationId: "loc_nyc",
    leaveType: "annual",
    available: 15,
    pending: 0,
    unit: "days",
    fetchedAt: new Date().toISOString(),
  },
  {
    employeeId: "emp_1",
    locationId: "loc_nyc",
    leaveType: "sick",
    available: 10,
    pending: 0,
    unit: "days",
    fetchedAt: new Date().toISOString(),
  },
  {
    employeeId: "emp_1",
    locationId: "loc_nyc",
    leaveType: "personal",
    available: 3,
    pending: 0,
    unit: "days",
    fetchedAt: new Date().toISOString(),
  },
  {
    employeeId: "emp_2",
    locationId: "loc_lon",
    leaveType: "annual",
    available: 20,
    pending: 0,
    unit: "days",
    fetchedAt: new Date().toISOString(),
  },
  {
    employeeId: "emp_2",
    locationId: "loc_lon",
    leaveType: "sick",
    available: 10,
    pending: 0,
    unit: "days",
    fetchedAt: new Date().toISOString(),
  },
  {
    employeeId: "emp_2",
    locationId: "loc_lon",
    leaveType: "personal",
    available: 3,
    pending: 0,
    unit: "days",
    fetchedAt: new Date().toISOString(),
  },
  {
    employeeId: "emp_3",
    locationId: "loc_nyc",
    leaveType: "annual",
    available: 18,
    pending: 0,
    unit: "days",
    fetchedAt: new Date().toISOString(),
  },
  {
    employeeId: "emp_3",
    locationId: "loc_lon",
    leaveType: "annual",
    available: 12,
    pending: 0,
    unit: "days",
    fetchedAt: new Date().toISOString(),
  },
];

export const SEED_REQUESTS: TimeOffRequest[] = [];
