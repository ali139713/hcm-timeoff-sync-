# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Claude Code Configuration

### Path-scoped Rules (`.claude/rules/`)

Rules activate automatically based on which file is being edited:

| Rule file | Applies to | Key constraint |
|---|---|---|
| `components.md` | `src/components/**/*.tsx` | Named exports, ErrorBoundary on data components, no fetch inside |
| `hooks.md` | `src/hooks/**/*.ts` | TanStack Query patterns, always return loading/error shape |
| `api-routes.md` | `src/app/api/**/*.ts` | Validate input first, chaos mode support, typed responses |
| `stories.md` | `src/**/*.stories.tsx` | Every meaningful UI state must have a story, use play() for interactions |
| `tests.md` | `tests/**/*.ts` | Vitest + Testing Library, MSW for HCM mocks, one concern per file |

### Hooks (`.claude/settings.json`)

| Event | Action |
|---|---|
| `SessionStart` | Checks Node version, env vars |
| `PostToolUse(Edit\|Write)` | Auto-runs `npm run lint:fix` |
| `Stop` | Reminds to run `npm run typecheck` and `npm test` |

### Custom Slash Commands (`.claude/commands/`)

| Command | What it does |
|---|---|
| `/seed-hcm` | Resets mock HCM state to baseline fixture data |
| `/add-story <ComponentName>` | Scaffolds a Storybook story with all required UI states |
| `/hcm-scenario <mode>` | Triggers a chaos scenario (silent_fail, conflict, slow, anniversary) |
| `/check-states <ComponentName>` | Lists all UI states a component must handle |

## npm Commands

```bash
# Development
npm run dev              # Start dev server (Node 20 required)
npm run build            # Production build
npm run lint:fix         # Auto-fix ESLint issues
npm run typecheck        # TypeScript check — run before reporting any task done

# Testing
npm test                 # Run all Vitest tests once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Storybook
npm run storybook        # Local Storybook at localhost:6006
npm run build-storybook  # Build static Storybook for Chromatic
```

## Architecture

@import .claude/architecture.md

## Key Constraints

- Never show "approved" optimistically — only "pending HCM confirmation"
- Always roll back optimistic balance deduction on HCM failure and preserve the user's draft
- Mock HCM endpoints must support `?mode=` chaos injection for Storybook stories
- Every component that reads balance data must handle: loading, stale, error, and empty states
- `npm run typecheck` must pass before any task is considered complete
