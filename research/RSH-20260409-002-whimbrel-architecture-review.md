# RSH-20260409-002: Whimbrel Architecture Review

Opened: `2026-04-09 05-23-17 KST`
Recorded by agent: `codex-20260409-repo-template-adoption`

## Metadata

- Source: legacy `logs/2-ARCHITECTURE_REVIEW.md`
- Scope: architectural risks, anti-patterns, and refactor candidates
- Status: migrated research only; not accepted implementation direction

## Research Question

Which architectural patterns in the current Whimbrel codebase are most likely to cause maintenance or reliability problems later?

## Why This Belongs To This Repo

The repo already contains runtime complexity around serial I/O, DFU, and UI coordination. Capturing architectural findings in a reusable memo helps future runs separate diagnosis from approved work.

## Findings

- Serial and DFU flows currently rely on manual polling loops in places where event-driven promises or stream-based handling would likely be cleaner and easier to trace.
- Some runtime state is stored in module-level singleton variables, especially around serial connections, which increases coupling across the app lifecycle.
- The firmware flow mixes UI control, network requests, archive parsing, and flashing orchestration in ways that make change isolation difficult.
- Some business configuration is hardcoded directly into runtime code rather than centralized in a dedicated config surface.
- The runtime still depends on ordered global script loading rather than native ES module boundaries.
- DFU buffer handling likely performs extra allocations that could become inefficient during larger flashing operations.

## Promising Directions

- Replace polling-heavy code with event-driven or stream-oriented abstractions where it improves reliability and readability.
- Separate firmware concerns into clearer service, orchestration, and UI layers before any major feature expansion.
- Centralize mutable configuration so runtime behavior does not depend on scattered hardcoded constants.
- Treat an ES module migration as a deliberate architecture project rather than a drive-by cleanup.

## Dead Ends Or Rejected Paths

- None of these findings should be treated as accepted work until a future decision record approves scope, sequencing, and compatibility expectations.
- This memo is not a mandate to refactor the app immediately.

## Recommended Routing

- Keep this document in `research/` until the operator accepts one or more implementation directions.
- When a direction is accepted, create a `DEC-*` record and update `PLANS.md` before starting the runtime work.
