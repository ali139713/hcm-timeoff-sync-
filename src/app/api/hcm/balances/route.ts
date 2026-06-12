import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBalancesForEmployee, getSimMode } from "@/lib/hcm/sim";

const querySchema = z.object({
  employeeId: z.string().min(1).max(50),
});

// Batch corpus endpoint — expensive, used for initial hydration and reconciliation
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const parsed = querySchema.safeParse({
    employeeId: searchParams.get("employeeId"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  const { mode } = getSimMode();

  // Simulate realistic HCM latency so loading states are exercised
  const baseDelay = mode === "slow" ? 4000 : 150;
  await new Promise((r) => setTimeout(r, baseDelay));

  if (mode === "silent_fail") {
    // Returns stale data — frontend must detect discrepancy on reconcile
    return NextResponse.json({ balances: [], stale: true });
  }

  const balances = getBalancesForEmployee(parsed.data.employeeId);

  return NextResponse.json({ balances });
}
