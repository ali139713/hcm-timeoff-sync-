# API Route Rules

- Validate all input with Zod before any logic — reject early with 400
- Every mock HCM route must support `?mode=` query param: `silent_fail | conflict | slow | anniversary`
- Chaos modes are for Storybook and test harness — gate them behind `NODE_ENV !== 'production'`
- Return typed JSON responses — never return untyped `{}` or `any`
- Simulate realistic HCM latency (100–300ms baseline) so loading states are exercised in dev
- `silent_fail` mode: return 200 with unchanged balance — tests that the frontend detects the discrepancy
- `conflict` mode: return 409 with `{ code: 'INSUFFICIENT_BALANCE' | 'INVALID_DIMENSION' }`
- `slow` mode: delay 4000ms — tests that pending state is visible and not a flicker
- `anniversary` mode: increment balance by 5, return 200 — tests mid-session reconciliation
- The `_sim/trigger` endpoint allows Storybook play() functions to set chaos mode programmatically
