# DEC-20260409-001: Adopt Repo-Template Operating Layer For Whimbrel

Opened: `2026-04-09 05-23-19 KST`
Recorded by agent: `codex-20260409-repo-template-adoption`

## Metadata

- Status: `accepted`
- Scope: repo operations and provenance only
- Supersedes: none
- Related ids: `LOG-20260409-001`, `RSH-20260409-001`, `RSH-20260409-002`, `RSH-20260409-003`

## Decision

Whimbrel will adopt `repo-template` as its repo-native operating layer without changing the static app's runtime layout. The repo will use canonical root docs, durable research/decision/worklog directories, stable artifact IDs, and commit provenance trailers for all normal post-bootstrap work.

Additional decision points:

- keep the deployed app structure unchanged at repo root
- preserve `logs/` as a read-only legacy archive
- migrate the existing legacy notes into `RSH-*` research memos
- omit `upstream-intake/` in v1 because Whimbrel does not run a recurring upstream-review workflow
- add a local `skills/` layer for orchestration guidance
- document provenance rules now without adding CI or hook enforcement in v1

## Context

Before this adoption, Whimbrel already had useful technical notes and a public README, but it did not have one canonical in-repo system for separating product truth, operational status, accepted plans, reusable research, durable decisions, and execution history. The repo is also a static GitHub Pages app, so any adoption approach that required a runtime restructure would add unnecessary risk.

## Options Considered

1. Keep the current ad hoc documentation pattern.
2. Adopt only part of the template structure and defer provenance discipline.
3. Adopt the full operating layer while leaving runtime files untouched.

## Rationale

Option 3 gives Whimbrel the clarity benefits of the template without disturbing the deployed app. It keeps future repo work legible, preserves historical notes, and creates a clean place for architecture research and future decisions.

## Consequences

- Future durable work should be routed into the new canonical surfaces instead of `logs/`.
- Post-bootstrap commits should carry `project:`, `agent:`, `role:`, and `artifacts:` trailers.
- Contributors need to learn and follow the routing discipline manually until stronger enforcement is explicitly approved.
- If Whimbrel later starts a real upstream-tracking workflow, a separate decision should activate `upstream-intake/`.
