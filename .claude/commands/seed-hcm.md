# Seed Mock HCM

Resets the in-memory mock HCM state to the baseline fixture.

```bash
curl -X POST http://localhost:3000/api/hcm/_sim/reset
```

This sets balances back to the fixture defined in `src/lib/hcm/fixtures.ts`:
- 3 employees, 2 locations each
- Annual leave: 15 days, Sick leave: 10 days, Personal: 3 days

Use this before running integration tests or when Storybook state has drifted from manual testing.
