import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useBalances } from "@/hooks/useBalances";
import { SEED_BALANCES } from "@/lib/hcm/fixtures";
import { server } from "../msw-server";
import { createWrapper } from "../test-utils";

describe("useBalances", () => {
  it("returns balances after successful fetch", async () => {
    const { result } = renderHook(() => useBalances("emp_1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const emp1Balances = SEED_BALANCES.filter((b) => b.employeeId === "emp_1");
    expect(result.current.balances).toHaveLength(emp1Balances.length);
    expect(result.current.isError).toBe(false);
  });

  it("returns empty array while loading", () => {
    server.use(
      http.get("/api/hcm/balances", async () => {
        await new Promise(() => {}); // never resolves
        return HttpResponse.json({});
      })
    );

    const { result } = renderHook(() => useBalances("emp_1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.balances).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("sets isError on HCM failure", async () => {
    server.use(
      http.get("/api/hcm/balances", () => HttpResponse.error())
    );

    const { result } = renderHook(() => useBalances("emp_1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.balances).toEqual([]);
  });

  it("does not fetch when employeeId is empty", () => {
    const { result } = renderHook(() => useBalances(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.balances).toEqual([]);
  });
});
