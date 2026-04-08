# DEC-20260409-002: Enable Commit Provenance Enforcement And Thin Agent Entrypoints

Opened: `2026-04-09 06-54-29 KST`
Recorded by agent: `codex-20260409-repo-template-normalization`

## Metadata

- Status: accepted
- Deciders: operator, orchestrator
- Refines: `DEC-20260409-001`
- Related ids: `LOG-20260409-002`

## Decision

Whimbrel will normalize its repo-template adoption by:

- adding thin repo-root `AGENTS.md` and `CLAUDE.md` entrypoints
- treating local directory `README.md` guides as binding document-format contracts
- enabling commit provenance enforcement both locally and in CI

The local enforcement will use the repo-template-style `commit-msg` hook plus validator scripts, adapted to require `project: whimbrel` and repo-template artifact IDs. CI will re-run the same standards across pushed or pull-request commit ranges.

## Context

Whimbrel had already adopted the repo-template operating model, but some local docs still used lighter ad hoc guide text and the repo had no tool-facing entrypoints or commit-time enforcement. That left the process documented but not actively enforced.

## Options Considered

### Keep Documentation-Only Guidance

- Upside: smallest implementation change
- Downside: agents and contributors can continue drifting in doc shape and commit provenance

### Add Local Hooks Only

- Upside: fast feedback before commits are created
- Downside: remote pushes and PRs would still lack an authoritative backstop

### Add Local Hooks And CI Enforcement

- Upside: gives fast local feedback and remote re-validation
- Upside: matches repo-template's recommended enforcement posture
- Downside: contributors must install hooks locally and learn the required trailers

## Rationale

The combined hook and CI approach gives Whimbrel the strongest practical enforcement without changing the runtime app. Thin `AGENTS.md` and `CLAUDE.md` files make the canonical rules discoverable to tools, while normalized directory guides reduce formatting drift in future repo artifacts.

## Consequences

- Future commits are expected to carry compliant `project:`, `agent:`, `role:`, and `artifacts:` trailers unless they are explicit bootstrap or migration exceptions.
- Local contributors should run `scripts/install-hooks.sh` so commit-time checks happen before commit creation.
- CI will reject pushed or PR commit ranges that contain non-compliant commit messages.
- Repo-specific runtime constraints remain in force: Whimbrel stays a static root-served web app, `logs/` remains legacy archive, and `upstream-intake/` stays inactive unless a future decision enables it.
