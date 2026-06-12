# Add Story

Scaffolds a Storybook story file for a given component with all required UI states.

## Usage
/add-story <ComponentName>

## What it does
1. Reads the component at `src/components/**/<ComponentName>.tsx`
2. Identifies all props and state variants
3. Creates `src/components/**/<ComponentName>.stories.tsx` with:
   - MSW handler setup via `msw-storybook-addon`
   - Stories for every required state (loading, empty, populated, stale, optimistic-pending,
     optimistic-rolled-back, hcm-rejected, hcm-silently-wrong, balance-refreshed-mid-session, error)
   - `play()` interaction tests for stateful stories
4. Wraps stories in the required QueryClient and Zustand providers

## Rules
- Never skip a state — if the component can be in it, there must be a story for it
- Use MSW handlers per story, not global mocks
- Args must use types from `src/types/index.ts`
