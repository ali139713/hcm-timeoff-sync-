# HCM Scenario

Triggers a specific chaos scenario on the mock HCM server.

## Usage
/hcm-scenario <mode>

## Modes

| Mode | Behaviour |
|---|---|
| `silent_fail` | HCM returns 200 but does not deduct balance — frontend must detect discrepancy on reconcile |
| `conflict` | HCM returns 409 INSUFFICIENT_BALANCE — frontend rolls back optimistic update |
| `slow` | HCM delays 4s — tests that pending state is visible throughout |
| `anniversary` | HCM adds +5 days to annual leave mid-session — tests StaleBanner reconciliation |
| `reset` | Returns HCM to baseline fixture state |

## Example
```bash
curl -X POST http://localhost:3000/api/hcm/sim \
  -H "Content-Type: application/json" \
  -d '{"mode": "anniversary", "employeeId": "emp_1"}'
```

## Notes
- Chaos modes only work in `NODE_ENV !== 'production'`
- Mode persists until next request or explicit reset
- Storybook `play()` functions use this endpoint to set up story scenarios programmatically
