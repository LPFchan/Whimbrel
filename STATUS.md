# Whimbrel Status

This document tracks current operational truth.
Update it when the project's real state changes.
Do not use it as a transcript or a scratchpad.

## Snapshot

- Last updated: `2026-04-09`
- Overall posture: `active`
- Current focus: keep the static app deployable while using the normalized repo-native operating layer and enforced commit provenance workflow
- Highest-priority blocker: there is no automated regression harness for Web Serial, DFU, and provisioning behavior
- Next operator decision needed: whether any architecture-review findings should graduate from research into accepted refactor plans
- Related decisions: `DEC-20260409-001`, `DEC-20260409-002`

## Current State Summary

Whimbrel is an active static GitHub Pages application built from hand-authored HTML, CSS, and JavaScript at the repo root. It remains deployable without a build step. This repo now has a normalized repo-template operating layer with thin `AGENTS.md` and `CLAUDE.md` entrypoints, local writing-guide enforcement through directory `README.md` files, and commit provenance checks in both local Git hooks and CI. The older `logs/` folder remains preserved as legacy context.

## Active Phases Or Tracks

### Runtime App Maintenance

- Goal: keep the firmware flashing and key-provisioning workflows operational for Guillemot and Uguisu
- Status: `in progress`
- Why this matters now: Whimbrel is the operator-facing browser tool for firmware updates and secure provisioning
- Current work: maintain a vanilla static app with manual verification and no bundler or test runner
- Exit criteria: the operator can continue serving and using the app without runtime regressions
- Dependencies: GitHub Pages, GitHub release availability, Chromium Web Serial support, JSZip, and the current device-side protocols
- Risks: browser API changes, CDN dependency drift, and limited automated regression coverage
- Related ids: `RSH-20260409-001`, `RSH-20260409-002`

### Repo Operating Layer

- Goal: keep future repo work routed into canonical docs, research memos, decision records, and worklogs
- Status: `done`
- Why this matters now: Whimbrel previously had useful notes but no single operating model for future maintenance
- Current work: canonical docs, migrated research memos, thin agent entrypoints, normalized writing guides, commit provenance checks, and a local orchestration skill
- Exit criteria: future changes use stable IDs and update the correct surfaces instead of adding new ad hoc note patterns
- Dependencies: contributor discipline, local hook installation, and continued use of the documented routing model
- Risks: contributors may ignore local guide shapes, bypass local hook installation, or keep writing future durable notes into `logs/`
- Related ids: `DEC-20260409-001`, `DEC-20260409-002`, `LOG-20260409-001`, `LOG-20260409-002`, `RSH-20260409-001`, `RSH-20260409-002`, `RSH-20260409-003`

## Recent Changes To Project Reality

- Date: `2026-04-09`
  - Change: adopted a repo-native operating model with canonical truth, status, planning, research, decisions, and worklogs
  - Why it matters: future maintenance can now be routed into stable in-repo artifacts instead of scattered notes
  - Related ids: `DEC-20260409-001`, `LOG-20260409-001`
- Date: `2026-04-09`
  - Change: mapped legacy technical notes in `logs/` into new `RSH-*` research memos while preserving the originals
  - Why it matters: historical context remains available, but the active durable layer now follows one naming and provenance system
  - Related ids: `RSH-20260409-001`, `RSH-20260409-002`, `RSH-20260409-003`
- Date: `2026-04-09`
  - Change: normalized repo-template writing guides, added thin repo-root agent entrypoints, and enabled local plus CI commit provenance checks
  - Why it matters: future repo docs and commits now have explicit structural and commit-time enforcement instead of documentation-only expectations
  - Related ids: `DEC-20260409-002`, `LOG-20260409-002`

## Active Blockers And Risks

- Blocker or risk: missing automated end-to-end or unit coverage for Web Serial and DFU flows
  - Effect: regressions will likely be detected through manual validation rather than fast automated checks
  - Owner: operator and future implementation runs
  - Mitigation: keep runtime changes deliberate, capture them in `LOG-*` artifacts, and add tests only when the repo accepts that investment
  - Related ids: `RSH-20260409-002`
- Blocker or risk: existing architecture findings are still research, not accepted implementation direction
  - Effect: contributors could mistake exploratory findings for approved refactor work
  - Owner: operator/orchestrator
  - Mitigation: create new `DEC-*` records before turning major architecture ideas into active implementation plans
  - Related ids: `RSH-20260409-002`
- Blocker or risk: local hook enforcement only applies where contributors have installed the repo hook path
  - Effect: a contributor can miss fast local feedback and only discover commit problems in CI
  - Owner: operator and future contributors
  - Mitigation: keep `AGENTS.md`, `CLAUDE.md`, and `scripts/install-hooks.sh` explicit about local setup, while CI remains the remote backstop
  - Related ids: `DEC-20260409-002`, `LOG-20260409-002`

## Immediate Next Steps

- Next: use stable IDs and commit trailers for all non-bootstrap work from this point forward
  - Owner: operator and future agents
  - Trigger: the next meaningful repo change or maintenance task
  - Related ids: `DEC-20260409-001`, `DEC-20260409-002`
- Next: keep local hooks installed and verify the next real commit or PR passes the new provenance checks
  - Owner: operator and future contributors
  - Trigger: the next local commit or pushed branch
  - Related ids: `DEC-20260409-002`, `LOG-20260409-002`
- Next: review the architecture-research memo and decide which, if any, refactors should become accepted plans
  - Owner: operator/orchestrator
  - Trigger: when runtime maintenance needs or available time justify architecture work
  - Related ids: `RSH-20260409-002`
