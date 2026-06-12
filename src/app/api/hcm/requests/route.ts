import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addRequest,
  deductBalance,
  getAllRequests,
  getSimMode,
  resolveRequest,
} from "@/lib/hcm/sim";

const submitSchema = z.object({
  id: z.string().min(1).max(50),
  employeeId: z.string().min(1).max(50),
  locationId: z.string().min(1).max(50),
  leaveType: z.enum(["annual", "sick", "personal"]),
  days: z.number().int().min(1).max(365),
  startDate: z.string().min(1).max(20),
  endDate: z.string().min(1).max(20),
  note: z.string().max(500).optional(),
});

const resolveSchema = z.object({
  requestId: z.string().min(1).max(50),
  action: z.enum(["approve", "deny"]),
});

export async function GET() {
  const requests = getAllRequests();
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mode } = getSimMode();

  if (mode === "slow") {
    await new Promise((r) => setTimeout(r, 4000));
  }

  if (mode === "conflict") {
    return NextResponse.json(
      { error: "insufficient balance", code: "INSUFFICIENT_BALANCE" },
      { status: 409 }
    );
  }

  const { employeeId, locationId, leaveType, days } = parsed.data;
  const deducted = deductBalance(employeeId, locationId, leaveType, days);

  if (!deducted) {
    return NextResponse.json(
      { error: "insufficient balance", code: "INSUFFICIENT_BALANCE" },
      { status: 409 }
    );
  }

  const newRequest = {
    ...parsed.data,
    status: "pending_hcm" as const,
    submittedAt: new Date().toISOString(),
  };

  if (mode === "silent_fail") {
    // Accept the request but don't actually deduct — frontend detects on reconcile
    return NextResponse.json({ request: newRequest });
  }

  addRequest(newRequest);
  return NextResponse.json({ request: newRequest }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = resolveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { requestId, action } = parsed.data;
  resolveRequest(requestId, action === "approve");

  return NextResponse.json({ ok: true });
}
