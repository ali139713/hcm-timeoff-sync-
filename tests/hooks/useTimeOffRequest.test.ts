import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useTimeOffRequest } from "@/hooks/useTimeOffRequest";
import { server } from "../msw-server";
import { createWrapper, makeTestQueryClient } from "../test-utils";
import { keys } from "@/lib/query-client";
import { SEED_BALANCES } from "@/lib/hcm/fixtures";

const PAYLOAD = {
  id: "req_test_1",
  employeeId: "emp_1",
  locationId: "loc_nyc",
  leaveType: "annual" as const,
  days: 3,
  startDate: "2025-09-01",
  endDate: "2025-09-03",
};

const EMP1_BALANCES = SEED_BALANCES.filter((b) => b.employeeId === "emp_1");

describe("useTimeOffRequest — optimistic update", () => {
  it("deducts balance in cache while mutation is in-flight", async () => {
    // Slow handler so the mutation is still pending when we check the cache
    server.use(
      http.post("/api/hcm/requests", async () => {
        await new Promise((r) => setTimeout(r, 500));
        return HttpResponse.json({ request: { id: "r1", status: "pending_hcm" } }, { status: 201 });
      })
    );

    const client = makeTestQueryClient();
    client.setQueryData(keys.balances("emp_1"), { balances: EMP1_BALANCES });

    const { result } = renderHook(() => useTimeOffRequest(), {
      wrapper: createWrapper(client),
    });

    act(() => { result.current.submit(PAYLOAD); });

    // Wait for onMutate (async) to run, mutation still in-flight
    await waitFor(() => expect(result.current.isPending).toBe(true));

    const cached = client.getQueryData<{ balances: typeof SEED_BALANCES }>(
      keys.balances("emp_1")
    );
    const annual = cached?.balances.find(
      (b) => b.locationId === "loc_nyc" && b.leaveType === "annual"
    );
    expect(annual?.available).toBe(12); // 15 - 3
    expect(annual?.pending).toBe(3);

    // Wait for completion
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("rolls back balance on HCM conflict (409)", async () => {
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

    act(() => { result.current.submit(PAYLOAD); });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    // After rollback the cache snapshot is restored, then onSettled re-fetches.
    // We assert the re-fetch gets the correct (unmodified) value from MSW.
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

  it("cancels in-flight refetches before applying optimistic update", async () => {
    const client = makeTestQueryClient();
    client.setQueryData(keys.balances("emp_1"), { balances: EMP1_BALANCES });

    const cancelQueriesSpy = vi.spyOn(client, "cancelQueries");

    const { result } = renderHook(() => useTimeOffRequest(), {
      wrapper: createWrapper(client),
    });

    act(() => { result.current.submit(PAYLOAD); });

    await waitFor(() =>
      expect(cancelQueriesSpy).toHaveBeenCalledWith({
        queryKey: keys.balances("emp_1"),
      })
    );
  });
});

describe("useTimeOffRequest — silent failure detection", () => {
  it("reconciles with authoritative cell balance after settlement", async () => {
    // HCM 201 success, but per-cell read returns original (deduction didn't happen)
    server.use(
      http.get("/api/hcm/balance", ({ request }) => {
        const url = new URL(request.url);
        const balance = SEED_BALANCES.find(
          (b) =>
            b.employeeId === url.searchParams.get("employeeId") &&
            b.locationId === url.searchParams.get("locationId") &&
            b.leaveType === url.searchParams.get("leaveType")
        );
        return HttpResponse.json(balance);
      })
    );

    const client = makeTestQueryClient();
    client.setQueryData(keys.balances("emp_1"), { balances: EMP1_BALANCES });

    const { result } = renderHook(() => useTimeOffRequest(), {
      wrapper: createWrapper(client),
    });

    act(() => { result.current.submit(PAYLOAD); });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    // onSettled patches the batch cache with the fresh per-cell value
    await waitFor(() => {
      const cached = client.getQueryData<{ balances: typeof SEED_BALANCES }>(
        keys.balances("emp_1")
      );
      const annual = cached?.balances.find(
        (b) => b.locationId === "loc_nyc" && b.leaveType === "annual"
      );
      // HCM returned original (15) — cache now reflects the authoritative value
      expect(annual?.available).toBe(15);
    });
  });
});
