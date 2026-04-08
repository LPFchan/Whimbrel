# RSH-20260409-003: Commit History Cleanup Guidance

Opened: `2026-04-09 05-23-18 KST`
Recorded by agent: `codex-20260409-repo-template-adoption`

## Metadata

- Source: legacy `logs/3-REMOVE_CLAUDE_COAUTHOR_FROM_COMMITS.md`
- Scope: repository-history cleanup guidance
- Status: migrated maintenance research

## Research Question

What durable guidance should Whimbrel maintainers follow if they need to remove unwanted Claude co-author trailers from historical commits?

## Why This Belongs To This Repo

History-rewrite procedures are rare but high-risk. Keeping a reusable memo in the research layer makes the guidance discoverable without treating it as current operational truth.

## Findings

- Removing co-author trailers from historical commit messages requires rewriting Git history; a normal new commit is not enough.
- The repo should be clean before a rewrite starts, and maintainers should verify which commits are affected before rewriting.
- The legacy note documents a `git filter-branch` approach and also mentions `git filter-repo` as a modern alternative when available.
- Any successful history rewrite changes commit SHAs and requires a force push plus collaborator coordination.
- Cleanup steps such as removing backup refs and pruning reflogs are optional but useful after a verified rewrite.

## Promising Directions

- Use this memo only when a real history-cleanup task exists.
- Prefer a dedicated `LOG-*` worklog if the rewrite is ever actually performed.
- Capture operator approval before any force-push rewrite because it changes public history.

## Dead Ends Or Rejected Paths

- Do not treat this as routine maintenance.
- Do not apply the documented commands casually on shared branches without explicit approval and a rollback plan.

## Recommended Routing

- Keep this memo in `research/` as maintenance guidance.
- If a rewrite is approved, create a new `LOG-*` worklog and any necessary `DEC-*` record before execution.
