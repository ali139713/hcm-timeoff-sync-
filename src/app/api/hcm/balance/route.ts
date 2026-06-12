import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBalance, getSimMode } from "@/lib/hcm/sim";

const querySchema = z.object({
  employeeId: z.string().min(1).max(50),
  locationId: z.string().min(1).max(50),
  leaveType: z.enum(["annual", "sick", "personal"]),
});

// Real-time per-cell read — the authoritative single-balance endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const parsed = querySchema.safeParse({
    employeeId: searchParams.get("employeeId"),
    locationId: searchParams.get("locationId"),
    leaveType: searchParams.get("leaveType"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mode } = getSimMode();

  if (mode === "slow") {
    await new Promise((r) => setTimeout(r, 4000));
  }

  const { employeeId, locationId, leaveType } = parsed.data;
  const balance = getBalance(employeeId, locationId, leaveType);

  if (!balance) {
    return NextResponse.json(
      { error: "not found", code: "INVALID_DIMENSION" },
      { status: 404 }
    );
  }

  return NextResponse.json(balance);
}
