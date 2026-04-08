# LOG-20260409-002: Normalize Doc Guides And Enable Commit Checks

Opened: `2026-04-09 06-54-29 KST`
Recorded by agent: `codex-20260409-repo-template-normalization`

## Metadata

- Run type: orchestrator
- Goal: normalize repo-template-facing docs and enable commit provenance enforcement without changing the runtime app
- Related ids: `DEC-20260409-002`

## Task

Merge repo-template's document-writing and commit-enforcement rules into Whimbrel's existing operating layer while preserving repo-specific truth.

## Scope

- In scope: `AGENTS.md`, `CLAUDE.md`, `repo-operating-model.md`, directory guide normalization, commit-check scripts, git hook wiring, CI workflow, and status/decision updates
- In scope: preserving existing artifact IDs, dates, and historical facts
- Out of scope: runtime app refactors, full-repo doc rewrites, or activating `upstream-intake/`

## Entry 2026-04-09 06-54-29 KST

- Action: audited the current repo against the repo-template sources for operating rules, agent entrypoints, writing guides, git hooks, scripts, and workflow enforcement
- Files touched: none
- Checks run: `find . -maxdepth 4 -type f | sort`, `git config --local --get core.hooksPath || true`, `sed -n '1,260p'` across repo-template and local repo docs
- Output: confirmed there were no existing `AGENTS.md`, `CLAUDE.md`, hook files, commit-check scripts, or CI workflow to merge with
- Blockers: none
- Next: patch in the normalized docs and enforcement files

## Entry 2026-04-09 06-54-29 KST

- Action: added thin repo-root agent entrypoints, normalized local directory writing guides toward the repo-template defaults, and merged commit-time enforcement into the repo operating model
- Files touched: `AGENTS.md`, `CLAUDE.md`, `repo-operating-model.md`, `research/README.md`, `records/decisions/README.md`, `records/agent-worklogs/README.md`, `STATUS.md`
- Checks run: none during edit
- Output: the repo now points tools at canonical rules and treats local guide `README.md` files as the formatting contract for durable artifacts
- Blockers: none
- Next: add the actual hook and CI enforcement files, then verify them

## Entry 2026-04-09 06-54-29 KST

- Action: added `.githooks/commit-msg`, the commit-check scripts, the CI workflow, and new decision/worklog artifacts for the normalization run
- Files touched: `.githooks/commit-msg`, `scripts/check-commit-standards.sh`, `scripts/check-commit-range.sh`, `scripts/install-hooks.sh`, `.github/workflows/commit-standards.yml`, `records/decisions/DEC-20260409-002-enable-commit-provenance-enforcement.md`, `records/agent-worklogs/LOG-20260409-002-normalize-doc-guides-and-enable-commit-checks.md`
- Checks run: local commit-message script validation, local hook installation, workflow/script existence checks
- Output: Whimbrel now has both local and remote commit provenance enforcement
- Blockers: none
- Next: summarize intentional divergences and remind contributors to keep hooks installed locally

## Entry 2026-04-09 07-15-36 KST

- Action: reduced `CLAUDE.md` to the repo-template shim so `AGENTS.md` remains the single tool-facing instruction surface
- Files touched: `CLAUDE.md`, `records/agent-worklogs/LOG-20260409-002-normalize-doc-guides-and-enable-commit-checks.md`
- Checks run: `sed -n '1,80p' CLAUDE.md`, `git diff --check`
- Output: `CLAUDE.md` now mirrors the scaffold shim pattern and no longer duplicates repo-specific policy already enforced elsewhere
- Blockers: none
- Next: commit the shim change on `main`, merge it into `demo`, and push both branches
