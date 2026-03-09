# Removing Claude Co-Authored-By Lines from All Commits

This document describes how to strip `Co-Authored-By: Claude` trailers from every commit message in a Git repository. Cursor/Claude sometimes adds these when using AI-assisted commits.

## Problem

Commit messages may contain footer trailers such as:

```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

These appear on GitHub and other tools as co-authors. To remove them across the entire history, you must rewrite commits.

## Prerequisites

- Git
- A clean working tree (no uncommitted changes)

## Step 1: Find affected commits (optional)

Check if any commits contain Claude co-author lines:

```bash
git log --all --format="%B" | grep -i "Co-Authored-By: Claude"
```

## Step 2: Rewrite commit messages with filter-branch

Use `git filter-branch` with a `--msg-filter` to remove lines matching the pattern. The filter receives each commit message on stdin and outputs the new message on stdout.

```bash
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter \
  'grep -v -i "Co-Authored-By: Claude"' \
  --tag-name-filter cat -- --all
```

**What this does:**
- `--msg-filter`: Runs the given shell command on each commit message
- `grep -v -i "Co-Authored-By: Claude"`: Outputs only lines *not* matching the pattern (case-insensitive)
- `--tag-name-filter cat`: Keeps tags pointing at rewritten commits
- `-- --all`: Rewrites all branches

**Result:** Every branch and the `origin/*` remote-tracking refs are rewritten. Commit hashes change because the message is part of the commit object.

## Step 3: Verify

Confirm the lines are gone on your main branch:

```bash
git log main --format="%B" | grep -i claude || echo "No Claude references found"
```

## Step 4: Force push to remote

Because history was rewritten, a normal push will be rejected. Force push:

```bash
git push --force origin main    # repeat for each branch
# or
git push --force origin main demo
```

## Step 5: Clean up

Remove backup refs and prune reflog (optional but recommended):

```bash
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now
```

## Important notes

1. **History rewrite:** Commit SHAs change. Anyone who has cloned must re-clone or rebase.

2. **Force push:** Use only on branches you own or where collaborators are aware. `git push --force-with-lease` is safer if others might push.

3. **Backup:** Create a backup branch before rewriting: `git branch backup-before-rewrite`

4. **Revert:** If something goes wrong before cleanup, you can restore:  
   `git reset --hard refs/original/refs/heads/main`

5. **Other trailers:** To remove different co-author patterns (e.g. other AI tools), adjust the `grep -v` pattern accordingly.

## Alternative: git filter-repo

The newer [git-filter-repo](https://github.com/newren/git-filter-repo) tool can also rewrite messages and is often faster. Example (if installed):

```bash
git filter-repo --message-callback 'return re.sub(r"\nCo-Authored-By: Claude[^\n]*\n", "\n", message)'
```
