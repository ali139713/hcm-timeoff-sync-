# Custom Hook Rules

- All server state via TanStack Query — never useState + useEffect for data fetching
- Cache keys must be arrays: `['balance', employeeId, locationId]` — never plain strings
- Every query hook returns `{ data, isLoading, isError, isStale }` — callers must not need to check raw query state
- Mutations use `onMutate` for optimistic update, `onError` for rollback, `onSettled` for invalidation
- Never invalidate the entire query cache — always invalidate the narrowest possible key
- `staleTime: 30_000` is the project default; override only with a comment explaining why
- `refetchOnWindowFocus: true` is always on — do not disable it
- Hooks that read per-cell balance use `['balance', employeeId, locationId]` key
- Hooks that read the full corpus use `['balances', employeeId]` key
- If a mutation is in-flight (`isMutating`), queue background reconciliation — do not apply it mid-flight
