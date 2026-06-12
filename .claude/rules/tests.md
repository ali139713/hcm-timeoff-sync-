# Test Rules

- Vitest only — never introduce Jest
- MSW for all HCM endpoint mocking — never mock fetch directly
- Three test layers with distinct jobs:
  1. Unit (pure functions): balance arithmetic, error classification, cache key builders
  2. Component (Vitest + Testing Library): state transitions, rollback UX, error recovery
  3. Integration (against mock HCM routes): full request lifecycle, reconciliation after conflict
- Do not mock TanStack Query internals — render with a real QueryClient in tests
- Reset MSW handlers between tests — do not let handler state leak across cases
- Each test file covers one concern: `useTimeOffRequest.test.ts` tests the mutation hook, not the component
- Test file names mirror source: `RequestForm.tsx` → `RequestForm.test.tsx`
- Use `describe` blocks named after the behaviour being tested, not the function name
- Integration tests must exercise: happy path, HCM conflict, HCM silent failure, in-flight reconciliation
