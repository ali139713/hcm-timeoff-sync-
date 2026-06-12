# Architecture

## Overview

HCM Time-Off Sync is a Next.js frontend that sits in front of an external HCM system (Workday / SAP analogue). ExampleHR does not own the balance data — the HCM is the source of truth. The frontend's job is to make reads feel instant and writes feel safe, while remaining honest about what it actually knows.

## Folder Structure

```
src/
  app/
    employee/           # Employee view — balance grid + request form
    manager/            # Manager view — approval queue with live balance context
    api/
      hcm/
        balance/        # GET /api/hcm/balance?employeeId=&locationId=  (real-time per-cell)
        balances/       # GET /api/hcm/balances?employeeId=             (batch corpus)
        requests/       # POST/PATCH /api/hcm/requests                  (submit + approve/deny)
        sim/            # POST /api/hcm/sim                    (chaos controls)
  components/
    balance/            # BalanceGrid, BalanceRow, BalanceCell, StaleBanner
    request/            # RequestForm, RequestStatus, RollbackNotice
    manager/            # ApprovalCard, ApprovalQueue
    ui/                 # shadcn primitives (owned source, not npm)
  hooks/
    useBalance.ts       # TanStack Query wrapper — per-cell real-time read
    useBalances.ts      # TanStack Query wrapper — batch hydration
    useTimeOffRequest.ts # Mutation with optimistic update + rollback
    useRequests.ts      # Request list + approve/deny mutation
  lib/
    hcm/
      client.ts         # Typed fetch wrapper for all HCM endpoints
      sim.ts            # Simulation state (anniversary bonus, chaos modes)
    store/
      ui.ts             # Zustand — modal state, submission step machine
  types/
    index.ts            # Balance, TimeOffRequest, HCMError, SimMode
```

## Data Flow

```
HCM Batch Endpoint ──► useBalances (initial hydration, staleTime 30s)
                              │
                              ▼
                       BalanceGrid (renders per-location rows)
                              │
                    user submits request
                              │
                              ▼
                  useTimeOffRequest.mutate()
                    - optimistic: deduct balance in cache
                    - show "Pending HCM confirmation" state
                              │
                    HCM responds
                   ┌──────────┴──────────┐
                 success               failure / conflict
                   │                       │
          invalidate balance key      rollback cache
          fetch real-time cell        show RollbackNotice
          confirm deduction           preserve user's draft
```

## Key Decisions

### Why TanStack Query + Zustand (not Redux Toolkit)
TanStack Query owns all server state with built-in optimistic update/rollback, cache keying per `[employeeId, locationId]`, and `refetchOnWindowFocus`. Zustand owns only ephemeral UI state (modal open, submission step). RTK Query would unify these but forces Redux everywhere — the ceremony isn't justified for the local state we have.

### Optimistic strategy: "pending, not approved"
We never show "approved" until HCM confirms. The optimistic deduction is shown as a tentative balance with a pending indicator. This eliminates the worst failure mode: user told approved → HCM says denied.

### Cache invalidation
- `staleTime: 30_000` — treats balance as fresh for 30s, avoids redundant fetches
- `refetchOnWindowFocus: true` — immediate recheck when user returns to tab
- After mutation settles: invalidate only the affected `[employeeId, locationId]` key
- Background reconciliation: if balance changes while a mutation is in-flight, queue the update and apply after mutation settles

### Mock HCM chaos controls
All interesting failure modes are injectable via `?mode=` query param or the `sim` endpoint:
- `silent_fail` — 200 response but balance unchanged
- `conflict` — explicit conflict error
- `slow` — 4s delay to test pending state
- `anniversary` — fires a +5 day bonus mid-session
