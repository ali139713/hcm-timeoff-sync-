# Check States

Lists all UI states a component must handle and verifies story coverage.

## Usage
/check-states <ComponentName>

## What it does
1. Reads `src/components/**/<ComponentName>.tsx`
2. Analyses props, hook return values, and conditional rendering branches
3. Lists every state the component can be in
4. Cross-references against `<ComponentName>.stories.tsx`
5. Reports any states without a corresponding story

## Required states for balance-reading components
- loading (skeleton)
- empty (no balances for employee)
- populated (normal render)
- stale (data older than staleTime, showing stale indicator)
- optimistic-pending (request submitted, awaiting HCM confirmation)
- optimistic-rolled-back (HCM rejected, balance restored, RollbackNotice visible)
- hcm-rejected (explicit 409 conflict response)
- hcm-silently-wrong (200 response but reconciliation detects discrepancy)
- balance-refreshed-mid-session (StaleBanner shown, user prompted to accept new balance)
- error (HCM unreachable, error boundary fallback)

## Output
Prints a checklist. Any uncovered state is a gap that must be addressed before the component is considered done.
