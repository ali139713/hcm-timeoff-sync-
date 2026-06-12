# HCM Time-Off Sync

Time-off request frontend for ExampleHR — optimistic updates, balance reconciliation, and graceful degradation when the source of truth lives in an external HCM system.

## Requirements

- Node 20.x (`nvm use 20.19.4`)
- npm

## Setup

```bash
npm install
```

No environment variables are required — all HCM endpoints are mocked locally.

## Running the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The landing page has links for two employee views (Sarah Chen, James Okafor) and one manager view (Maria Santos). Switch between them to exercise the full request and approval flow.

## Running tests

```bash
# Unit + hook + integration tests (27 tests)
npx vitest run --project unit

# All tests including Storybook interaction tests
npm test
```

## Running Storybook

```bash
npm run storybook
```

Opens at [http://localhost:6006](http://localhost:6006).

Stories cover every meaningful UI state: loading, empty, stale, optimistic-pending, optimistic-rolled-back, HCM-rejected, HCM-silently-wrong, balance-refreshed-mid-session, and error. Each stateful story has a `play()` interaction test.

## Triggering chaos scenarios

The mock HCM has injectable failure modes for manual testing. While the dev server is running:

```bash
# Slow HCM — see the pending state for 4 seconds
curl -X POST http://localhost:3000/api/hcm/sim \
  -H "Content-Type: application/json" \
  -d '{"mode": "slow"}'

# HCM conflict — next request submission returns 409, triggers rollback
curl -X POST http://localhost:3000/api/hcm/sim \
  -H "Content-Type: application/json" \
  -d '{"mode": "conflict"}'

# Silent failure — 200 response but balance unchanged, caught on reconciliation
curl -X POST http://localhost:3000/api/hcm/sim \
  -H "Content-Type: application/json" \
  -d '{"mode": "silent_fail"}'

# Anniversary bonus — adds 5 days to annual leave mid-session, triggers StaleBanner
curl -X POST http://localhost:3000/api/hcm/sim \
  -H "Content-Type: application/json" \
  -d '{"mode": "anniversary", "employeeId": "emp_1"}'

# Reset HCM state to baseline
curl -X POST http://localhost:3000/api/hcm/sim \
  -H "Content-Type: application/json" \
  -d '{"mode": "reset"}'
```

## Project structure

```
src/
  app/
    employee/         # Employee view (balances + request form)
    manager/          # Manager view (approval queue)
    api/hcm/          # Mock HCM endpoints
  components/
    balance/          # BalanceGrid, BalanceCell, StaleBanner
    request/          # RequestForm, RollbackNotice
    manager/          # ApprovalQueue, ApprovalCard
    ui/               # shadcn primitives (owned source)
  hooks/              # useBalances, useBalance, useTimeOffRequest, useRequests
  lib/
    hcm/              # Mock HCM client, fixtures, in-memory sim state
    store/            # Zustand UI store (form step machine, banner state)
  types/              # Shared TypeScript types
  mocks/              # MSW handlers for Storybook and tests
tests/
  unit/               # Pure function tests (error classification, cache keys)
  hooks/              # Hook behaviour under mock network (MSW)
  integration/        # Full request lifecycle tests
.claude/
  rules/              # Path-scoped coding rules (components, hooks, api, stories, tests)
  commands/           # Custom slash commands (/seed-hcm, /add-story, /hcm-scenario)
  settings.json       # Hooks (lint on save, typecheck reminder)
  architecture.md     # Architecture overview (imported by CLAUDE.md)
```

## Technical decisions

See [TRD.md](./TRD.md) for the full Technical Requirements Document — covers optimistic update strategy, cache invalidation, background refresh conflict resolution, component tree design, test strategy, and alternatives considered.
