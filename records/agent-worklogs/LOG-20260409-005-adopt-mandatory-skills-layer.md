# LOG-20260409-005: Adopt Mandatory Skills Layer

Opened: `2026-04-09 20-34-00 KST`
Recorded by agent: `codex-20260409-mandatory-skills-layer`

## Metadata

- Run type: orchestrator
- Goal: update Whimbrel's repo-template operating layer so root `skills/` is a required repo-native procedure layer
- Related ids: `DEC-20260409-001`, `LOG-20260409-004`

## Task

Adopt the current repo-template baseline skills model without creating `scaffold/`, without enabling inactive `upstream-intake/`, and without erasing Whimbrel-specific guardrails.

## Scope

- In scope: `REPO.md`, `AGENTS.md`, `skills/README.md`, `skills/repo-orchestrator/SKILL.md`, `skills/daily-inbox-pressure-review/SKILL.md`, this worklog
- In scope: baseline root skills for orchestrator routing and daily inbox pressure review
- Out of scope: adding `skills/upstream-intake/`, adding `upstream-intake/`, changing runtime app files, rewriting historical logs

## Entry 2026-04-09 20-34-00 KST

- Action: audited the template scaffold skill layer and Whimbrel's root `skills/` directory
- Files touched: none
- Checks run: `rg --files skills`, `sed -n '1,240p' skills/README.md`, `sed -n '1,320p' skills/repo-orchestrator/SKILL.md`, `rg --files /Users/yeowool/Documents/repo-template/scaffold/skills`
- Output: confirmed Whimbrel had only `skills/repo-orchestrator/SKILL.md`; template baseline now also requires `skills/daily-inbox-pressure-review/SKILL.md`; upstream skill remains conditional
- Blockers: none
- Next: add the daily inbox skill at repo-root `skills/`, make the skills layer mandatory in policy/entrypoints, and keep upstream skill omitted

## Entry 2026-04-09 20-34-00 KST

- Action: updated policy and procedures for the mandatory skills layer
- Files touched: `REPO.md`, `AGENTS.md`, `skills/README.md`, `skills/daily-inbox-pressure-review/SKILL.md`, `records/agent-worklogs/LOG-20260409-005-adopt-mandatory-skills-layer.md`
- Checks run: `git diff --check`; required-skill file existence check; scaffold/upstream placement check; stale optional-skills wording scan; skill relative-link check; `diff -u /Users/yeowool/Documents/repo-template/scaffold/skills/daily-inbox-pressure-review/SKILL.md skills/daily-inbox-pressure-review/SKILL.md`
- Output: root `skills/` is now documented as the required procedure layer; daily inbox pressure review skill was added under root `skills/`
- Blockers: none
- Next: summarize adopted baseline, preserved Whimbrel-specific adaptations, and intentionally omitted upstream skill

## Entry 2026-04-09 20-34-00 KST

- Action: verified the mandatory skills-layer migration
- Files touched: `records/agent-worklogs/LOG-20260409-005-adopt-mandatory-skills-layer.md`
- Checks run: `git diff --check`; Python relative-link check across `skills/*/SKILL.md`; `test -f skills/README.md`; `test -f skills/repo-orchestrator/SKILL.md`; `test -f skills/daily-inbox-pressure-review/SKILL.md`; `test ! -e skills/upstream-intake`; `test ! -e scaffold`; stale optional-skills wording scan
- Output: all relative links in root skill files resolve; required baseline skill files exist; no `scaffold/` directory exists; no `skills/upstream-intake/` exists; daily inbox pressure review skill matches the repo-template scaffold skill exactly
- Blockers: none
- Next: none
