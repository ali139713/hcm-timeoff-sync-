import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  resetSim,
  setSimMode,
  triggerAnniversaryBonus,
} from "@/lib/hcm/sim";

const triggerSchema = z.object({
  mode: z.enum(["normal", "silent_fail", "conflict", "slow", "anniversary", "reset"]),
  employeeId: z.string().max(50).optional(),
  locationId: z.string().max(50).optional(),
});

// Chaos control endpoint — only available outside production
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = triggerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const { mode, employeeId } = parsed.data;

  if (mode === "reset") {
    resetSim();
    return NextResponse.json({ ok: true, mode: "reset" });
  }

  if (mode === "anniversary") {
    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId required for anniversary mode" },
        { status: 400 }
      );
    }
    triggerAnniversaryBonus(employeeId);
    setSimMode("normal");
    return NextResponse.json({ ok: true, mode: "anniversary", employeeId });
  }

  setSimMode(mode, employeeId);
  return NextResponse.json({ ok: true, mode });
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 403 });
  }

  const { getSimMode } = await import("@/lib/hcm/sim");
  return NextResponse.json(getSimMode());
}
