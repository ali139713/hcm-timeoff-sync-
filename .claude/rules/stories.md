# Storybook Story Rules

- Every component with meaningful UI states must have a `.stories.tsx` file
- Required states to cover for any balance-reading component:
  loading | empty | populated | stale | optimistic-pending | optimistic-rolled-back |
  hcm-rejected | hcm-silently-wrong | balance-refreshed-mid-session | error
- Use `play()` functions for interaction tests — clicks, form submission, rollback flows
- Use MSW handlers (via `msw-storybook-addon`) to mock HCM responses per story
- Do not use hardcoded setTimeout in play() — use `userEvent` and `expect` from `@storybook/test`
- Story args must use the shared types from `src/types/index.ts` — no inline mock shapes
- Each story file exports: `Default`, then named variants for each meaningful state
- Stories are the proof of state coverage — if a state isn't in Storybook, it hasn't been designed
