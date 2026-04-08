# LOG-20260409-003: Migrate Canonical Rules Doc To REPO

Opened: `2026-04-09 07-41-56 KST`
Recorded by agent: `codex-20260409-repo-contract-migration`

## Metadata

- Run type: orchestrator
- Goal: migrate the canonical repo contract from `repo-operating-model.md` to `REPO.md` without losing repo-specific truth
- Related ids: `DEC-20260409-001`, `DEC-20260409-002`

## Task

Rename the canonical rules doc to `REPO.md` and update active repo references so the current repo-template naming is used consistently.

## Scope

- In scope: canonical contract rename, `AGENTS.md` reference updates, active skills/plan/example updates, and verification that only historical mentions of the old filename remain
- In scope: preserving all existing repo-specific truth, dates, IDs, decisions, and workflow constraints
- Out of scope: changing policy semantics, rewriting historical artifacts, or activating new repo subsystems

## Entry 2026-04-09 07-41-56 KST

- Action: audited the repo for `repo-operating-model.md` and `REPO.md` references before editing
- Files touched: none
- Checks run: `find . -maxdepth 3 ...`, `rg -n "repo-operating-model\\.md|REPO\\.md" . --glob '!.git/**'`
- Output: confirmed the repo had `repo-operating-model.md`, no `REPO.md`, a thin `CLAUDE.md` shim already in place, and several active references that needed migration
- Blockers: none
- Next: rename the canonical rules file and update active references

## Entry 2026-04-09 07-41-56 KST

- Action: renamed `repo-operating-model.md` to `REPO.md` and updated active references in `AGENTS.md`, `PLANS.md`, `skills/README.md`, `skills/repo-orchestrator/SKILL.md`, and the worklog README example
- Files touched: `REPO.md`, `AGENTS.md`, `PLANS.md`, `skills/README.md`, `skills/repo-orchestrator/SKILL.md`, `records/agent-worklogs/README.md`
- Checks run: `git diff --check`, `rg -n "repo-operating-model\\.md|REPO\\.md" . --glob '!.git/**'`
- Output: the repo now treats `REPO.md` as the canonical contract, while remaining mentions of `repo-operating-model.md` are preserved only inside historical worklogs
- Blockers: none
- Next: commit the rename and propagate it to the other long-lived branch if needed
