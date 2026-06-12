import { http, HttpResponse, delay } from "msw";
import { SEED_BALANCES, SEED_REQUESTS } from "@/lib/hcm/fixtures";
import type { Balance, TimeOffRequest } from "@/types";

// Baseline handlers — stories override these per scenario via parameters.msw.handlers
export const baseHandlers = [
  http.get("/api/hcm/balances", ({ request }) => {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const balances = employeeId
      ? SEED_BALANCES.filter((b) => b.employeeId === employeeId)
      : SEED_BALANCES;
    return HttpResponse.json({ balances });
  }),

  http.get("/api/hcm/balance", ({ request }) => {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const locationId = url.searchParams.get("locationId");
    const leaveType = url.searchParams.get("leaveType");

    const balance = SEED_BALANCES.find(
      (b) =>
        b.employeeId === employeeId &&
        b.locationId === locationId &&
        b.leaveType === leaveType
    );

    if (!balance) {
      return HttpResponse.json(
        { error: "not found", code: "INVALID_DIMENSION" },
        { status: 404 }
      );
    }

    return HttpResponse.json(balance);
  }),

  http.get("/api/hcm/requests", () => {
    return HttpResponse.json({ requests: SEED_REQUESTS });
  }),

  http.post("/api/hcm/requests", async ({ request }) => {
    const body = (await request.json()) as Omit<
      TimeOffRequest,
      "status" | "submittedAt"
    >;
    return HttpResponse.json(
      {
        request: {
          ...body,
          status: "pending_hcm",
          submittedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  }),

  http.patch("/api/hcm/requests", () => {
    return HttpResponse.json({ ok: true });
  }),

  http.post("/api/hcm/sim", () => {
    return HttpResponse.json({ ok: true });
  }),
];

// Per-scenario handler factories used in story parameters
export const scenarios = {
  loading: [
    http.get("/api/hcm/balances", async () => {
      await delay("infinite");
      return HttpResponse.json({ balances: [] });
    }),
  ],

  empty: [
    http.get("/api/hcm/balances", () => {
      return HttpResponse.json({ balances: [] });
    }),
  ],

  stale: [
    http.get("/api/hcm/balances", () => {
      const staleBalances: Balance[] = SEED_BALANCES.map((b) => ({
        ...b,
        fetchedAt: new Date(Date.now() - 120_000).toISOString(),
      }));
      return HttpResponse.json({ balances: staleBalances, stale: true });
    }),
  ],

  hcmConflict: [
    http.post("/api/hcm/requests", () => {
      return HttpResponse.json(
        { error: "insufficient balance", code: "INSUFFICIENT_BALANCE" },
        { status: 409 }
      );
    }),
  ],

  hcmSlow: [
    http.post("/api/hcm/requests", async () => {
      await delay(4000);
      return HttpResponse.json(
        {
          request: {
            id: "req_slow",
            status: "pending_hcm",
            submittedAt: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    }),
  ],

  hcmSilentFail: [
    http.post("/api/hcm/requests", () => {
      // Returns 200 but balance is unchanged — caught on reconciliation
      return HttpResponse.json({ request: { status: "pending_hcm" } });
    }),
    http.get("/api/hcm/balance", ({ request }) => {
      const url = new URL(request.url);
      const employeeId = url.searchParams.get("employeeId");
      const locationId = url.searchParams.get("locationId");
      const leaveType = url.searchParams.get("leaveType");
      // Return original balance — no deduction happened
      const balance = SEED_BALANCES.find(
        (b) =>
          b.employeeId === employeeId &&
          b.locationId === locationId &&
          b.leaveType === leaveType
      );
      return HttpResponse.json(balance);
    }),
  ],

  anniversaryBonus: [
    http.get("/api/hcm/balances", () => {
      const boosted: Balance[] = SEED_BALANCES.map((b) =>
        b.leaveType === "annual" ? { ...b, available: b.available + 5 } : b
      );
      return HttpResponse.json({ balances: boosted });
    }),
  ],

  withPendingRequests: [
    http.get("/api/hcm/requests", () => {
      const pending: TimeOffRequest[] = [
        {
          id: "req_001",
          employeeId: "emp_1",
          locationId: "loc_nyc",
          leaveType: "annual",
          days: 3,
          startDate: "2025-08-01",
          endDate: "2025-08-03",
          note: "Summer vacation",
          status: "pending_hcm",
          submittedAt: new Date().toISOString(),
        },
        {
          id: "req_002",
          employeeId: "emp_2",
          locationId: "loc_lon",
          leaveType: "sick",
          days: 1,
          startDate: "2025-07-15",
          endDate: "2025-07-15",
          status: "pending_hcm",
          submittedAt: new Date().toISOString(),
        },
      ];
      return HttpResponse.json({ requests: pending });
    }),
  ],

  approveError: [
    http.patch("/api/hcm/requests", () => {
      return HttpResponse.json(
        { error: "HCM unavailable" },
        { status: 503 }
      );
    }),
  ],
};
