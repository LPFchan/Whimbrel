# RSH-20260409-003: Commit History Cleanup Guidance

Opened: 2026-04-09 05-23-18 KST
Recorded by agent: codex-20260409-repo-template-adoption

## Memo Status

- Source before active research memo: `logs/3-REMOVE_CLAUDE_COAUTHOR_FROM_COMMITS.md` from legacy archive / commit `a084d75`
- Legacy archive now: `logs/3-REMOVE_CLAUDE_COAUTHOR_FROM_COMMITS.md`
- Status: migrated maintenance guide; use only for an approved history-rewrite task
- Scope: removing unwanted `Co-Authored-By: Claude ...` trailers from historical commits

## Problem

Commit messages may contain footer trailers such as:

```text
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

These appear on GitHub and other tools as co-authors. Removing them across existing history is a history rewrite: a normal new commit is not enough.

## Prerequisites

- Explicit operator approval to rewrite the affected branch history
- Coordination with anyone else who may have cloned or pushed the rewritten branches
- Git
- Clean working tree
- Backup branch or other rollback point

Example backup:

```sh
git branch backup-before-rewrite
```

## Step 1: Find Affected Commits

Check whether commit messages contain Claude co-author lines:

```sh
git log --all --format="%B" | grep -i "Co-Authored-By: Claude"
```

Inspect branch-specific history before deciding rewrite scope.

## Step 2: Rewrite Commit Messages

The legacy note used `git filter-branch` with a message filter:

```sh
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter \
  'grep -v -i "Co-Authored-By: Claude"' \
  --tag-name-filter cat -- --all
```

What this does:

- `--msg-filter` runs a command on each commit message
- `grep -v -i "Co-Authored-By: Claude"` removes matching lines case-insensitively
- `--tag-name-filter cat` keeps tags pointing at rewritten commit equivalents
- `-- --all` targets all refs visible to the command

Result: rewritten commits get new SHAs because commit messages are part of the commit object.

## Step 3: Verify

Confirm the target branch no longer contains the unwanted trailer:

```sh
git log main --format="%B" | grep -i claude || echo "No Claude references found"
```

Also inspect a few rewritten commits manually before pushing.

## Step 4: Force Push Deliberately

A rewritten branch cannot be pushed with a normal fast-forward push.

Legacy command:

```sh
git push --force origin main
```

Safer default when collaborators may have pushed:

```sh
git push --force-with-lease origin main
```

Repeat deliberately for each rewritten long-lived branch, such as `main` and `demo`; do not force-push unrelated refs casually.

## Step 5: Clean Local Rewrite Backups

After verification and any needed rollback window, remove local filter-branch backup refs and prune old objects if desired:

```sh
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now
```

## Rollback Note

Before cleanup, a filter-branch rewrite may be recoverable from backup refs. Example from the legacy guide:

```sh
git reset --hard refs/original/refs/heads/main
```

Prefer an explicitly named backup branch and confirm which ref is correct before resetting.

## Alternative: git-filter-repo

The newer `git-filter-repo` tool can rewrite commit messages and is often faster and clearer when installed.

Example from the legacy guide:

```sh
git filter-repo --message-callback 'return re.sub(r"\nCo-Authored-By: Claude[^\n]*\n", "\n", message)'
```

Validate this callback against the exact trailer patterns in the repo before running it.

## Safety Notes

- Rewriting history changes commit SHAs.
- People with existing clones must re-clone, rebase, or otherwise reconcile rewritten history.
- Prefer `--force-with-lease` over plain `--force` when the remote may have changed.
- If other AI/tool co-author trailers need removal, adjust the match pattern intentionally instead of broadening it blindly.
- For an actual rewrite, open or update a relevant `LOG-*` and cite any `DEC-*`/operator approval before executing destructive history operations.
