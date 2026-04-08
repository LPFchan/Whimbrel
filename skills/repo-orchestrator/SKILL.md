---
name: repo-orchestrator
description: "Route Whimbrel work into the correct artifact layer while keeping runtime app files separate from repo-management artifacts."
argument-hint: "Task, intake item, maintenance request, or architectural note"
---

# Repo Orchestrator

Use this skill with:

- [../../REPO.md](../../REPO.md)
- [../../SPEC.md](../../SPEC.md)
- [../../STATUS.md](../../STATUS.md)
- [../../PLANS.md](../../PLANS.md)

## What This Skill Produces

- correctly routed Whimbrel repo artifacts
- clear separation between truth, plans, research, decisions, and worklogs
- stable IDs plus lightweight provenance
- runtime changes that stay grounded in the static-app constraints documented in this repo

## Procedure

1. Classify the work in routing order.
   - Is this untriaged intake?
   - Is this durable truth?
   - Is this current operational reality?
   - Is this accepted future direction?
   - Is this reusable research?
   - Is this a durable decision?
   - Is this execution history?

2. Route it to the correct layer.
   - `SPEC.md`
   - `STATUS.md`
   - `PLANS.md`
   - `INBOX.md`
   - `research/`
   - `records/decisions/`
   - `records/agent-worklogs/`

3. Assign stable IDs when needed.
   - `IBX-*`
   - `RSH-*`
   - `DEC-*`
   - `LOG-*`
   - Use the least available `NNN` for that date and artifact type.

4. Write the artifact with provenance.
   - Include `Opened: YYYY-MM-DD HH-mm-ss KST`
   - Include `Recorded by agent: <agent-id>`

5. Preserve the separation rules.
   - Do not write speculation straight into `PLANS.md`.
   - Do not let worklogs masquerade as decisions.
   - Do not let inbox entries become long-term truth.
   - Do not treat research memos as raw transcripts.

6. If the task crosses layers, create multiple artifacts deliberately.
   - Example: `RSH-*` plus `LOG-*`
   - Example: `DEC-*` plus `PLANS.md`
   - Example: `LOG-*` plus `STATUS.md`

7. If Git commits are created, add commit trailers.
   - `project: whimbrel`
   - `agent: <agent-id>`
   - `role: orchestrator|worker|subagent|operator`
   - `artifacts: <artifact-id>[, <artifact-id>...]`
   - Prefer referencing and updating an existing relevant `LOG-*` before creating a new one.

8. Do not invent an upstream-review workflow inside this repo.
   - If recurring upstream review becomes necessary later, escalate to add an explicit `upstream-intake/` subsystem instead.

## Escalation Triggers

Escalate instead of guessing when the work:

- changes durable product or system truth
- changes public device or browser compatibility posture
- resolves a real policy or workflow conflict
- changes operator-facing workflow in a non-obvious way
- turns an architecture-research finding into approved runtime work

## Quality Bar

- clear routing
- clear provenance
- clean separation of layers
- runtime-aware recommendations that preserve Whimbrel's static app constraints unless a new decision changes them
