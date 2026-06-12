# Technical Requirements Document
## HCM Time-Off Sync — ExampleHR Frontend

---

## 1. Problem Statement

ExampleHR's time-off module presents a deceptively simple interface — show balances, let employees request leave, let managers approve it — over a fundamentally difficult data ownership problem: the HCM system (Workday, SAP, or equivalent) is the source of truth, and ExampleHR does not control it.

This creates three concrete challenges that cannot be solved by standard CRUD patterns:

**1. Balances mutate without warning.** Work anniversaries, year resets, and manager adjustments can change a balance while an employee has the tab open. The displayed number can go stale without any user action.

**2. Instant feedback conflicts with correctness.** An employee expects to click "Submit" and see something happen immediately. But HCM might reject the request, or the balance they saw when they clicked was already wrong. The UI cannot tell them "approved" until HCM confirms — but it also cannot make them stare at a spinner for 4 seconds.

**3. Silent failures exist.** HCM does not always respond with a clear error. It can return 200 while silently not completing the operation. The frontend must detect this on reconciliation, not trust the status code.

The solution must resolve these tensions without confusing the user or misrepresenting the state of their data.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Browser                           │
│                                                     │
│  ┌──────────────┐        ┌──────────────────────┐   │
│  │ Employee View│        │    Manager View       │   │
│  │              │        │                       │   │
│  │ BalanceGrid  │        │  ApprovalQueue        │   │
│  │ RequestForm  │        │  ApprovalCard         │   │
│  └──────┬───────┘        └──────────┬────────────┘   │
│         │                          │               │
│  ┌──────▼──────────────────────────▼────────────┐  │
│  │           TanStack Query Cache               │  │
│  │  ['balances', empId]  ['requests', 'all']    │  │
│  │  ['balance', empId, locId, leaveType]        │  │
│  └──────────────────────┬───────────────────────┘  │
│                         │                          │
└─────────────────────────┼──────────────────────────┘
                          │ fetch / mutate
                ┌─────────▼──────────┐
                │  Mock HCM Routes   │
                │  (Next.js handlers)│
                │                   │
                │  GET  /balance     │  ← real-time per-cell
                │  GET  /balances    │  ← batch corpus
                │  POST /requests    │  ← submit
                │  PATCH /requests   │  ← approve/deny
                │  POST /sim         │  ← chaos injection
                └───────────────────┘
```

**State ownership:**
- TanStack Query owns all server state (balances, requests, in-flight mutation state)
- Zustand owns only ephemeral UI state (request form step machine, stale banner dismissed flags)
- The HCM is the ground truth — the cache is always a snapshot, never authoritative

---

## 3. Key Technical Decisions

### 3.1 Optimistic Updates — "Pending, Not Approved"

**The decision:** When an employee submits a time-off request, we immediately deduct the days from the displayed balance, but we never show "Approved". The status is `pending_hcm` — visually distinct, with a "Pending HCM confirmation" badge — until the HCM responds.

**Why not fully optimistic (show "Approved" immediately)?**
This is the worst failure mode. If the user sees "Approved" and then later gets a notification that it was actually denied, trust is broken and the confusion is hard to recover from. The assignment brief calls this out explicitly: "Should never be told 'approved' and then later 'actually, denied.'"

**Why not fully pessimistic (wait for HCM before updating UI)?**
The spec asks for instant feedback. A 4-second spinner on a form submission is bad UX, and the slow HCM scenario is explicitly part of the test matrix. Pessimistic also means the balance display doesn't update until settlement, which feels broken to the user.

**The middle ground:** Deduct the balance immediately (fast, feels responsive), but label the request as `pending_hcm` (honest, cannot mislead). If HCM rejects, roll back the deduction and preserve the user's draft. The user sees a clear recovery path, not a broken state.

**Implementation:** TanStack Query's `onMutate` / `onError` / `onSettled` lifecycle:

```
onMutate  → cancel in-flight refetches, snapshot cache, apply optimistic deduction
onError   → restore snapshot, classify error, preserve draft in Zustand
onSettled → fetch authoritative per-cell balance, patch batch cache, invalidate
```

The `cancelQueries` call in `onMutate` is critical: without it, a background `refetchOnWindowFocus` that fires just before the mutation would overwrite the optimistic state with the pre-mutation balance mid-flight.

---

### 3.2 Cache Key Design

All cache keys live in a central registry (`src/lib/query-client.ts`). This is a deliberate constraint — a cache key typo in one file would silently create a separate cache entry, meaning invalidations would never hit the intended data.

```typescript
keys.balances('emp_1')                       // ['balances', 'emp_1']
keys.balance('emp_1', 'loc_nyc', 'annual')   // ['balance', 'emp_1', 'loc_nyc', 'annual']
keys.allRequests                             // ['requests', 'all']
```

**Two-tier balance system:**
- `balances` (batch): used for display, initial hydration, `staleTime: 30_000`. Fetched once per session, marked stale after 30s.
- `balance` (per-cell): `staleTime: 0`, disabled by default, only fetched on demand. Used in two places: (a) `onSettled` reconciliation after a mutation, and (b) when a manager clicks "Check balance" before approving.

The per-cell endpoint is HCM's authoritative real-time read. It is never polled. Polling it for every cell on every render would hammer HCM for data that rarely changes. We call it precisely when correctness is required — immediately after a write, and at manager decision time.

**Why this matters for managers:** A manager approving a request should not base their decision on a balance that was cached 30 minutes ago. The "Check balance" button in the ApprovalCard triggers a fresh per-cell read. This is a deliberate UX choice: we do not auto-fetch for every pending card (expensive), but we give the manager the tool to verify freshness before acting.

---

### 3.3 Cache Invalidation Strategy

After a mutation settles (success or failure), we do not invalidate the entire cache. We invalidate only the narrowest possible key.

**Why targeted invalidation?**
Invalidating the entire query cache on every mutation would cause all open components to re-fetch simultaneously. For an employee with multiple locations and leave types, that's N concurrent requests on every submit and every approval. Targeted invalidation means only the affected balance cell is refetched.

**The `onSettled` reconciliation:**
`onSettled` always runs — on success and on error. It fetches the real-time per-cell balance from HCM and patches the batch cache with the authoritative value. This is the silent failure detection mechanism: if HCM returned 200 but didn't actually deduct, the per-cell read returns the unchanged balance, and the batch cache is corrected to reflect reality. The `StaleBanner` component can then surface this discrepancy to the user.

**`refetchOnWindowFocus`:**
Enabled globally. When a user returns to the tab (e.g., they submitted a request and switched to email), TanStack Query immediately marks stale data for refetch. This catches external HCM mutations (anniversary bonuses, manager adjustments) that happened while the tab was in the background, without any polling.

---

### 3.4 Background Refresh vs In-Flight Mutation

This is the race condition most implementations miss.

**The scenario:** An employee opens the app. In the background, their anniversary bonus fires and TanStack Query picks it up via a `refetchOnWindowFocus`. Simultaneously, the employee clicks "Submit request". Two things are trying to update the same cache entry at the same time.

**The problem without mitigation:** The background refetch resolves after the optimistic update and writes the pre-mutation balance back into the cache. The optimistic deduction disappears. The user sees their balance bounce back as if nothing happened.

**The fix:** `onMutate` calls `await queryClient.cancelQueries({ queryKey: keys.balances(employeeId) })` before applying the optimistic update. This cancels any in-flight fetches for that key. The background data arrives, is cancelled, and the optimistic state is applied cleanly. After `onSettled`, a fresh refetch occurs with the correct post-mutation data.

The stale-cell detection in `BalanceGrid` also guards this: it checks `useIsMutating()` before comparing fresh data against the previous snapshot. If a mutation is in-flight, the comparison is skipped entirely, so an optimistic deduction is never misreported as an external balance change.

---

### 3.5 Error Classification

Not all HCM errors require the same user response:

| Error | Classification | UX |
|---|---|---|
| `409 INSUFFICIENT_BALANCE` | Domain error — will not resolve on retry | "You don't have enough days available." Roll back, preserve draft. |
| `409 INVALID_DIMENSION` | Domain error — employee/location mismatch | "This location combination isn't valid for your account." Roll back. |
| `503` / network failure | Transient — may resolve on retry | "Couldn't reach the HR system." Roll back, retry option. |
| `200` + silent failure | Detected only on reconciliation | `StaleBanner` surfaces discrepancy after `onSettled` per-cell read. |

The `isHCMConflict` function gates the retry logic in the QueryClient: domain errors (409 with a known code) are not retried — they will fail again. Network errors get one retry.

Errors are never echoed back to the user verbatim. The `classifyHCMError` function maps HCM error codes to human-readable, recovery-oriented messages. This prevents the UI from leaking HCM internals into the employee experience.

---

### 3.6 Component Tree and Data Concerns

The component tree is designed so data-fetching concerns do not leak into presentational components.

```
Providers (QueryClientProvider, Toaster)
└── BalanceGrid                          ← owns useBalances + stale-cell detection
    ├── BalanceRow × N
    │   └── BalanceCell                  ← receives Balance prop, no fetch
    └── StaleBanner (conditional)        ← reads from Zustand dismiss state
RequestForm                              ← owns useTimeOffRequest mutation
└── RollbackNotice (conditional)         ← reads rollback reason from Zustand
ApprovalQueue                            ← owns useRequests
└── ApprovalCard × N                     ← owns useBalance (on-demand), useResolveRequest
```

**Rules:**
- Components below `BalanceGrid` and `ApprovalCard` receive data as props. They do not fetch, do not import Prisma, do not call APIs.
- Every component that reads balance data is wrapped in an `ErrorBoundary`. A bad HCM response for one employee's balance must not crash the entire manager view.
- `BalanceGrid` is the only component that detects external balance changes. Reconciliation is a grid-level concern, not a per-row concern — one comparison pass over the fetched corpus, one banner per changed cell, rather than six subscriptions.

---

## 4. Mock HCM Design

The mock HCM is built as Next.js route handlers with injectable chaos via a `?mode=` query parameter and a `POST /api/hcm/sim` endpoint. This was a deliberate choice over MSW-only mocking.

**Why server-side mock routes?**
MSW handlers are process-local and reset between test runs. The `sim` endpoint persists state in memory across requests within a dev server session, which means manual testing and demos can exercise complex scenarios (anniversary bonus mid-session, slow HCM, silent failures) against a single running server. Storybook stories use MSW handler overrides instead, since they run isolated from the dev server.

The mock is gated behind `NODE_ENV !== 'production'` — the chaos injection endpoint returns 403 in production.

**Chaos modes:**

| Mode | Behaviour | What it tests |
|---|---|---|
| `normal` | Baseline — real logic | Happy path |
| `slow` | 4s delay on all mutations | Pending state visibility |
| `conflict` | 409 on POST /requests | Rollback and error classification |
| `silent_fail` | 200 + no deduction | Reconciliation detection in onSettled |
| `anniversary` | +5 days to annual leave | StaleBanner mid-session |

---

## 5. State Management — TanStack Query + Zustand

**Why TanStack Query for server state?**
The alternatives considered were SWR and RTK Query.

SWR is simpler but its mutation model is weaker — `onMutate` / `onError` / `onSettled` with snapshot-based rollback is a first-class pattern in TanStack Query. SWR requires more manual wiring to achieve the same rollback behaviour, which means more surface area for bugs.

RTK Query would unify state management under Redux, but it forces Redux everywhere including for local UI state (modal open/closed, submission step). The boilerplate overhead is not justified for the amount of local state in this application.

TanStack Query gives us: per-key cache with configurable staleness, optimistic update with rollback, `isMutating` for reconciliation gating, `cancelQueries` for race condition prevention, and `refetchOnWindowFocus` as a first-class option. All five of these are directly used in this implementation.

**Why Zustand for local UI state?**
The submission step machine (`idle → submitting → pending_hcm → confirmed | rolled_back`) and the stale banner dismissed state are not server state — they do not need to be fetched, cached, or invalidated. Putting them in TanStack Query would create a fake "server" for local concerns. Putting them in React `useState` would require prop drilling through `RequestForm → RollbackNotice → retry handler`. Zustand gives a flat, typed store that any component in the tree can read without prop drilling, with no boilerplate.

---

## 6. Test Strategy

Three layers, each guarding a different class of regression:

### Layer 1 — Unit tests (pure functions)
Files: `tests/unit/`

Guards: business logic that does not depend on React or the network.
- `classifyHCMError` — all error codes, non-object inputs, fallback behaviour
- `isHCMConflict` — gates retry logic; a bug here means domain errors get retried unnecessarily
- Cache key structure — shape is locked down; a key rename in `query-client.ts` breaks a test, not a silent cache miss in production

These tests are fast (< 10ms each), have zero network dependency, and will never flake.

### Layer 2 — Hook tests (behaviour under mock network)
Files: `tests/hooks/`

Guards: the mutation lifecycle — optimistic update, rollback, reconciliation.

The most important tests are:
- **Optimistic deduction visible while in-flight** — uses a 500ms delayed MSW handler so we can assert the cache state before settlement. This proves `cancelQueries` + `setQueryData` in `onMutate` is working.
- **Rollback on 409** — after conflict response, the snapshot is restored. This proves `onError` restores the correct cache state.
- **Silent failure reconciliation** — MSW returns 200, per-cell read returns original balance. Proves `onSettled` patches the cache with the authoritative HCM value, not the optimistic one.
- **`cancelQueries` called before optimistic update** — spies on the QueryClient method to verify the race condition prevention is in place.

These tests use a real QueryClient (no mocks of TanStack Query internals), MSW for network interception, and `renderHook` from Testing Library. `gcTime: Infinity` is set in the test client because mutation hook tests have no active subscriber on the balance query — without it, cache entries are garbage-collected between assertions.

### Layer 3 — Integration tests (full lifecycle)
Files: `tests/integration/`

Guards: the end-to-end request and approval flows under realistic conditions.
- Submit → optimistic deduction → cache updated post-settlement
- Submit → HCM 409 → balance restored exactly to pre-mutation value
- Manager approve → optimistic status update
- Manager deny → optimistic status update
- Approval error → rollback to `pending_hcm`

These tests exercise the hook boundaries working together, not individual functions. A refactor that moves logic between `onMutate` / `onError` / `onSettled` will break here if the observable behaviour changes.

### What is not unit tested
Mock HCM route handlers are not unit tested in isolation — their logic is covered by the integration tests that call them via MSW. Testing the handlers separately would duplicate coverage without guarding additional regressions.

The stale-cell detection effect in `BalanceGrid` is not unit tested in isolation — its behaviour is inherently observable only in a rendered component across successive fetches. It is covered by the Storybook interaction tests (the `BalanceRefreshedMidSession` story exercises the path end-to-end).

### Storybook as a test layer
Storybook with MSW is the proof of state coverage. Every meaningful UI state has a named story. The `play()` functions are interaction tests: they fire user events and assert on DOM state. They run in a real browser (Chromium via Playwright) and are deployed to Chromatic for visual regression detection on each push.

The deliberate choice to use Storybook stories (not just component tests) for UI state coverage is that stories force you to design every state intentionally — you cannot accidentally leave `hcm-silently-wrong` as an untested code path if there is a named story for it.

---

## 7. Alternatives Considered

### WebSockets / SSE for real-time balance updates
The HCM API as described is a REST API (read/write per cell, batch read). A WebSocket or SSE channel would allow the HCM to push balance changes to the frontend without polling, making the reconciliation problem cleaner.

This was not implemented because: (a) the assignment spec does not describe a push API from HCM, (b) adding a persistent connection adds infrastructure complexity (connection management, reconnect logic, auth) disproportionate to the stated problem, and (c) `refetchOnWindowFocus` combined with targeted post-mutation reconciliation achieves the correctness guarantee without persistent connections for the described use case.

If the HCM exposed an event stream, the focus-driven refetch would be replaced with an SSE subscription that calls `queryClient.setQueryData` on incoming events — the stale-cell detection in `BalanceGrid` and the rest of the architecture remain unchanged.

### Polling on a fixed interval
A naive 60s poll on the batch endpoint was considered and rejected. It creates a constant load on an "expensive" endpoint (as described in the spec) regardless of whether the user is active or whether any data has changed. The `refetchOnWindowFocus` approach is cheaper: it only fires when there is a reason to believe the data might be stale (the user was away).

The exception is the `pending_hcm` state: if a request has been submitted and is awaiting HCM confirmation, a 10s poll on just that employee's balance would give faster feedback than waiting for a window focus event. This is noted as a future enhancement — it was not implemented because the assignment's mock HCM settles requests synchronously on submission, making the polling window zero.

### Single cache key for all balance data
A simpler approach would be a single `['balances']` key that holds all employee/location/leave-type combinations. Invalidation would be simpler — one key to invalidate after any mutation.

Rejected because: (a) it defeats the purpose of targeted invalidation — every mutation would cause every employee's balance to re-fetch, and (b) the HCM API is naturally per-employee, per-cell, so the cache shape should mirror the API shape.

### Server Components for balance display
Next.js App Router makes it easy to fetch data in Server Components and stream the initial HTML with real data. This was considered for the initial balance hydration.

Rejected because: (a) balance data is user-session-specific and cannot be cached at the CDN/page level without per-user cache keys, (b) the optimistic update pattern requires client-side cache ownership — a Server Component that fetches and renders cannot participate in TanStack Query's optimistic update lifecycle, and (c) the manager approval flow requires client-side interactivity that makes RSC a poor fit for the component tree.

---

## 8. Security Considerations

- **Chaos injection endpoints** are gated behind `NODE_ENV !== 'production'` and return 403 in production. They must not be deployed in a production environment.
- **Error messages** never echo user input or HCM internal error strings back to the UI. `classifyHCMError` maps error codes to fixed human-readable strings.
- **Zod validation** at every API boundary — all route handlers reject malformed input with 400 before any logic runs.
- **`z.string().max()`** constraints on all string fields at API boundaries to prevent oversized payloads.
- **No secrets in the client** — HCM authentication headers (if any) would be added at the BFF layer (the Next.js route handlers), never exposed to the browser.

---

## 9. Deployment Notes

- The mock HCM state is in-memory and resets on server restart. For a production system, HCM would be a real external API; the `client.ts` fetch wrapper, cache keys, and hook interfaces remain unchanged.
- Storybook is deployed to Chromatic for visual regression detection on each push.
- The `/api/hcm/sim` endpoint must be removed or permanently gated before any production deployment.
