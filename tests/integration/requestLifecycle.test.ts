import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useTimeOffRequest } from "@/hooks/useTimeOffRequest";
import { useResolveRequest } from "@/hooks/useRequests";
import { server } from "../msw-server";
import { createWrapper, makeTestQueryClient } from "../test-utils";
import { keys } from "@/lib/query-client";
import { SEED_BALANCES } from "@/lib/hcm/fixtures";
import type { TimeOffRequest } from "@/types";

const EMP1_BALANCES = SEED_BALANCES.filter((b) => b.employeeId === "emp_1");

const PENDING_REQUEST: TimeOffRequest = {
  id: "req_int_1",
  employeeId: "emp_1",
  locationId: "loc_nyc",
  leaveType: "annual",
  days: 2,
  startDate: "2025-10-01",
  endDate: "2025-10-02",
  status: "pending_hcm",
  submittedAt: new Date().toISOString(),
};

const SUBMIT_PAYLOAD = {
  employeeId: PENDING_REQUEST.employeeId,
  locationId: PENDING_REQUEST.locationId,
  leaveType: PENDING_REQUEST.leaveType,
  days: PENDING_REQUEST.days,
  startDate: PENDING_REQUEST.startDate,
  endDate: PENDING_REQUEST.endDate,
};

describe("request lifecycle — happy path", () => {
  it("submit → balance deducted optimistically while in-flight → cache updated after HCM responds", async () => {
    // Slow response so we can observe the optimistic state before settlement
    server.use(
      http.post("/api/hcm/requests", async () => {
        await new Promise((r) => setTimeout(r, 500));
        return HttpResponse.json({ request: { id: "r_int", status: "pending_hcm" } }, { status: 201 });
      })
    );

    const client = makeTestQueryClient();
    client.setQueryData(keys.balances("emp_1"), { balances: EMP1_BALANCES });

    const { result } = renderHook(() => useTimeOffRequest(), {
      wrapper: createWrapper(client),
    });

    act(() => { result.current.submit(SUBMIT_PAYLOAD); });

    // While in-flight: optimistic deduction visible
    await waitFor(() => expect(result.current.isPending).toBe(true));
    const optimistic = client.getQueryData<{ balances: typeof SEED_BALANCES }>(keys.balances("emp_1"));
    const optimisticAnnual = optimistic?.balances.find(
      (b) => b.locationId === "loc_nyc" && b.leaveType === "annual"
    );
    expect(optimisticAnnual?.available).toBe(13); // 15 - 2
    expect(optimisticAnnual?.pending).toBe(2);

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});

describe("request lifecycle — HCM conflict", () => {
  it("submit → HCM 409 → balance restored to pre-mutation value", async () => {
    server.use(
      http.post("/api/hcm/requests", () =>
        HttpResponse.json(
          { error: "insufficient balance", code: "INSUFFICIENT_BALANCE" },
          { status: 409 }
        )
      )
    );

    const client = makeTestQueryClient();
    client.setQueryData(keys.balances("emp_1"), { balances: EMP1_BALANCES });

    const { result } = renderHook(() => useTimeOffRequest(), {
      wrapper: createWrapper(client),
    });

    act(() => { result.current.submit({ ...SUBMIT_PAYLOAD, days: 5 }); });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    // After rollback + onSettled refetch, the fresh MSW value is in cache
    await waitFor(() => {
      const cached = client.getQueryData<{ balances: typeof SEED_BALANCES }>(
        keys.balances("emp_1")
      );
      const annual = cached?.balances.find(
        (b) => b.locationId === "loc_nyc" && b.leaveType === "annual"
      );
      expect(annual?.available).toBe(15);
    });
  });
});

describe("request lifecycle — manager approval", () => {
  it("approve → request status updated optimistically", async () => {
    const client = makeTestQueryClient();
    client.setQueryData(keys.allRequests, { requests: [PENDING_REQUEST] });

    const { result } = renderHook(() => useResolveRequest(), {
      wrapper: createWrapper(client),
    });

    act(() => {
      result.current.resolve({ requestId: PENDING_REQUEST.id, action: "approve" });
    });

    await waitFor(() => {
      const cached = client.getQueryData<{ requests: TimeOffRequest[] }>(keys.allRequests);
      const updated = cached?.requests.find((r) => r.id === PENDING_REQUEST.id);
      expect(updated?.status).toBe("approved");
    });
  });

  it("deny → request status updated optimistically", async () => {
    const client = makeTestQueryClient();
    client.setQueryData(keys.allRequests, { requests: [PENDING_REQUEST] });

    const { result } = renderHook(() => useResolveRequest(), {
      wrapper: createWrapper(client),
    });

    act(() => {
      result.current.resolve({ requestId: PENDING_REQUEST.id, action: "deny" });
    });

    await waitFor(() => {
      const cached = client.getQueryData<{ requests: TimeOffRequest[] }>(keys.allRequests);
      const updated = cached?.requests.find((r) => r.id === PENDING_REQUEST.id);
      expect(updated?.status).toBe("denied");
    });
  });

  it("approval error → optimistic rollback restores pending_hcm status", async () => {
    server.use(
      http.patch("/api/hcm/requests", () =>
        HttpResponse.json({ error: "HCM unavailable" }, { status: 503 })
      )
    );

    const client = makeTestQueryClient();
    client.setQueryData(keys.allRequests, { requests: [PENDING_REQUEST] });

    const { result } = renderHook(() => useResolveRequest(), {
      wrapper: createWrapper(client),
    });

    act(() => {
      result.current.resolve({ requestId: PENDING_REQUEST.id, action: "approve" });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    // After rollback, the original snapshot is restored
    await waitFor(() => {
      const cached = client.getQueryData<{ requests: TimeOffRequest[] }>(keys.allRequests);
      const reverted = cached?.requests.find((r) => r.id === PENDING_REQUEST.id);
      expect(reverted?.status).toBe("pending_hcm");
    });
  });
});
