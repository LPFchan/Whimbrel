# LOG-20260409-004: Adopt Append-First Worklog Policy

Opened: `2026-04-09 08-02-13 KST`
Recorded by agent: `codex-20260409-worklog-policy-migration`

## Metadata

- Run type: orchestrator
- Goal: align Whimbrel's repo-template operating rules with the append-first worklog policy while keeping commit provenance strict
- Related ids: `DEC-20260409-001`, `DEC-20260409-002`, `LOG-20260409-003`

## Task

Replace any lingering implication that a meaningful commit should create a new `LOG-*` by default, while preserving useful artifact linkage on normal commits.

## Scope

- In scope: `REPO.md`, `AGENTS.md`, the worklog guide, and the orchestrator skill
- In scope: allowing commits to reference existing updated artifacts rather than requiring a newly created worklog
- Out of scope: rewriting existing historical logs, weakening commit provenance checks, or changing runtime app behavior

## Entry 2026-04-09 08-02-13 KST

- Action: audited the repo's canonical rules, worklog guidance, orchestration skill, and commit-policy surfaces for wording that still implied new-worklog-by-default behavior
- Files touched: none
- Checks run: `sed -n '1,260p' REPO.md`, `sed -n '1,260p' AGENTS.md`, `sed -n '1,260p' records/agent-worklogs/README.md`, `sed -n '1,260p' skills/repo-orchestrator/SKILL.md`, `sed -n '1,260p' scripts/check-commit-standards.sh`, `sed -n '1,260p' .github/workflows/commit-standards.yml`
- Output: found that local worklog policy still described worklogs as append-only but did not clearly state append-first reuse as the default for continuing workstreams
- Blockers: none
- Next: update the canonical contract and agent-facing guidance to prefer appending to the latest relevant `LOG-*`

## Entry 2026-04-09 08-02-13 KST

- Action: updated the canonical repo contract, agent instructions, worklog guide, and orchestration skill to prefer appending to an existing relevant `LOG-*` and to allow normal commits to reference any relevant updated artifact
- Files touched: `REPO.md`, `AGENTS.md`, `records/agent-worklogs/README.md`, `skills/repo-orchestrator/SKILL.md`, `records/agent-worklogs/LOG-20260409-004-adopt-append-first-worklog-policy.md`
- Checks run: `git diff --check`
- Output: Whimbrel now explicitly requires useful artifact linkage without forcing a brand-new worklog for each meaningful commit
- Blockers: none
- Next: summarize the local divergence from repo-template and use this append-first policy for future maintenance runs
