# React Component Rules

- `'use client'` on any component using hooks, browser APIs, or event handlers
- Named exports only — default exports reserved for dynamic imports (e.g. map components needing `ssr: false`)
- Wrap every component that reads balance data in `<ErrorBoundary>` — a bad HCM response must never crash the chat
- No Prisma, no fetch, no direct API calls inside components — data comes only from hooks
- UI primitives from `src/components/ui/` (shadcn owned source), not from library directly
- Shared data shapes from `src/types/index.ts` — no inline ad-hoc types in component files
- Every data component must handle four states explicitly: loading skeleton, empty/no-data, error, and populated
- Tailwind class order: layout → spacing → typography → colour → interactive states
- Use `next/dynamic` with `ssr: false` for any component that touches `window` or Leaflet-style browser APIs
