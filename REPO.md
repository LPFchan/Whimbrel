# Whimbrel Repo Contract

This document is the canonical repo contract for Whimbrel.

## Purpose

Use this model when Whimbrel is managed by one operator plus many agents and you want the repo itself to remain legible over time.

The goal is simple:

- keep canonical truth in-repo
- keep noisy activity out of truth docs
- keep provenance explicit
- let the orchestrator route work without inventing new storage rules each time

This operating layer is additive. It does not change the static web app layout, GitHub Pages deployment model, or browser runtime architecture on its own.

## Project Metadata

- Project: Whimbrel
- Project id: `whimbrel`
- Canonical repo: `https://github.com/LPFchan/Whimbrel`
- Runtime shape: static HTML/CSS/JavaScript app served from the repo root
- Legacy archive: `logs/` remains as read-only historical context
- Upstream intake status: inactive unless a future decision explicitly activates `upstream-intake/`

## Core Surfaces

Every repo using this model should separate these surfaces:

| Surface | Role | Mutability |
| --- | --- | --- |
| `SPEC.md` | Durable statement of what Whimbrel is supposed to be. | rewritten |
| `STATUS.md` | What is true right now operationally. | rewritten |
| `PLANS.md` | Accepted future direction that is not current truth yet. | rewritten |
| `INBOX.md` | Ephemeral intake waiting for triage. | append then purge |
| `research/` | Curated research memos worth keeping. | append by new file |
| `records/decisions/` | Durable decision records with rationale. | append-only by new file |
| `records/agent-worklogs/` | Execution history for runs, agents, and subagents. | append-only |
| `upstream-intake/` | Optional upstream review subsystem. | inactive in this repo unless explicitly enabled |

## Agent Compatibility Files

Some coding agents look for repo-root instruction files such as `AGENTS.md` or `CLAUDE.md`.

When a repo using this model includes them:

- they should act as entrypoints into the canonical rules, not competing policy documents
- they should stay short enough that they do not drift from `REPO.md`
- `CLAUDE.md` may import or reference `REPO.md` when the tool supports it
- `SKILL.md` stays separate because it defines a bounded reusable procedure, not repo-wide policy

Recommended split:

- `REPO.md`
  - canonical rules
- `AGENTS.md`
  - tool-facing summary plus read order
- `CLAUDE.md`
  - Claude Code memory shim into the same rules
- `skills/<name>/SKILL.md`
  - procedure for one repeatable workflow

## Artifact Writing Discipline

Macro structure is not enough on its own. Agents should not improvise document shape when the repo already defines one.

When writing repo artifacts:

- read the nearest canonical surface, directory `README.md`, and any explicit template before drafting
- if the local `README.md` includes a default shape or canonical example, follow it by default
- default to the established section order for that artifact type unless the task has a strong reason to differ
- write normalized repo records, not chat transcripts or stream-of-consciousness notes
- keep facts, decisions, open questions, and next steps clearly separated
- summarize evidence and outcomes instead of pasting raw command output unless the literal output is the artifact
- prefer short declarative bullets or paragraphs over vague filler

When a directory exists to store a durable artifact type, it should ideally include:

- a `README.md` that explains what belongs there
- a default shape or canonical example inside that same `README.md`

That single guide helps future agents copy a house style instead of inventing one.

## Separation Rules

These boundaries are mandatory:

- `SPEC.md` is not a changelog.
- `STATUS.md` is not a transcript.
- `PLANS.md` is not a brainstorm dump.
- `INBOX.md` is not durable truth.
- `research/` is not raw execution history.
- `records/decisions/` is not the same as `records/agent-worklogs/`.
- `logs/` is legacy context, not the active operating layer.
- Off-Git memory is not a substitute for repo-local canonical docs.

That separation gives future operators and future agents fast answers to different questions:

- What is the project? -> `SPEC.md`
- What is true right now? -> `STATUS.md`
- What future work is actually accepted? -> `PLANS.md`
- What did we learn from exploration? -> `research/`
- What did we decide and why? -> `records/decisions/`
- What actually happened during execution? -> `records/agent-worklogs/`

## Roles

### Operator

The operator is the final authority for product direction, escalation outcomes, and acceptance of truth changes.

### Orchestrator Agent

The orchestrator owns synthesis and routing.

It may:

- triage inbox items
- classify work into the right artifact layer
- update `SPEC.md`, `STATUS.md`, and `PLANS.md`
- create research memos
- create decision records
- append to ongoing worklogs and create new worklogs only when clarity requires a separate execution record
- translate messenger intake into repo artifacts
- escalate non-obvious product, architecture, workflow, or policy calls

### Worker Agents

Worker agents execute bounded tasks.

They may:

- append to worklogs
- propose truth changes through the orchestrator
- create evidence, summaries, and implementation outputs

They should not update `SPEC.md`, `STATUS.md`, or `PLANS.md` directly unless the operator explicitly allows that flow.

### Messenger Surfaces

Messenger surfaces are intake and control channels.

They may:

- create or append inbox intake
- request approvals
- deliver summaries
- surface blocked states

They must not write truth docs directly.

## Orchestrator Routing Ladder

When new work arrives, the orchestrator should classify it in this order:

1. Is this untriaged intake?
   - Route to `INBOX.md`.
2. Is this recurring upstream review?
   - Route to `upstream-intake/` only if that subsystem has been explicitly activated for this repo.
3. Is this durable truth about what the project is?
   - Route to `SPEC.md`.
4. Is this current operational reality?
   - Route to `STATUS.md`.
5. Is this accepted future direction?
   - Route to `PLANS.md`.
6. Is this reusable exploration or horizon-expansion work?
   - Route to `research/`.
7. Is this a meaningful decision with rationale?
   - Route to `records/decisions/`.
8. Is this execution history?
   - Route to `records/agent-worklogs/`.

One task may legitimately touch multiple layers. For example:

- a research session can create `RSH-*` plus a `LOG-*`
- a product choice can create `DEC-*` and update `PLANS.md`
- implementation progress can append `LOG-*` and update `STATUS.md`

## Write Rules

- `SPEC.md`, `STATUS.md`, and `PLANS.md` should be updated only by the operator or orchestrator.
- `INBOX.md` is an aggressive scratch disk. Purge entries once they are reflected elsewhere.
- `research/` keeps curated findings only.
- `records/decisions/` is append-only by new decision file.
- `records/agent-worklogs/` is append-only by appended entries or, when clarity requires it, a new log file.
- `upstream-intake/` should preserve its own paired internal-record and operator-brief workflow if the subsystem is ever activated.
- Truth docs should reflect the latest accepted state, not every intermediate thought.

### Worklog Reuse Policy

Do not create a new `LOG-*` just to satisfy provenance.

Append to the latest relevant `LOG-*` when:

- the same workstream, goal, or blocker is still in scope
- the new work is part of the same execution thread
- an additional entry preserves clarity

Create a new `LOG-*` only when:

- the work is a distinct new stream or bounded task
- a new agent or subagent is doing materially separate execution
- the prior log would become confusing, bloated, or misleading if reused
- the new work deserves its own execution record for future retrieval

## Stable IDs

This model assumes:

- `project-id` identifies the repo or workspace
- `agent-id` identifies one conversation or run, 1:1
- subagents receive their own `agent-id`
- Off-Git systems resolve parent-child lineage, messages, events, and commit history from `agent-id`

Recommended prefixes:

- `IBX-YYYYMMDD-NNN`
- `RSH-YYYYMMDD-NNN`
- `DEC-YYYYMMDD-NNN`
- `LOG-YYYYMMDD-NNN`
- `UPS-YYYYMMDD-NNN`

Numbering is per day and per artifact type. Any agent may claim the next ID by checking the least available `NNN`.

Every stable-ID-bearing artifact should open with:

- `Opened: YYYY-MM-DD HH-mm-ss KST`
- `Recorded by agent: <agent-id>`

## Commit Provenance

After this repo adopted the operating model, every normal commit should include these trailers:

- `project: whimbrel`
- `agent: <agent-id>`
- `role: orchestrator|worker|subagent|operator`
- `artifacts: <artifact-id>[, <artifact-id>...]`

Rules:

- `artifacts:` may list more than one stable ID, comma-separated.
- A normal commit should always reference at least one relevant stable ID, newly created or updated.
- Artifact-less commits should be treated as bootstrap or migration exceptions only.
- The commit side and the repo-artifact side should reinforce the same provenance graph.

Normal commits do not require a brand-new `LOG-*`.

- Prefer appending to an existing relevant `LOG-*` when the same workstream is continuing.
- Create a new `LOG-*` only when it improves clarity.
- Commits may reference `LOG-*`, `DEC-*`, `RSH-*`, `UPS-*`, or another relevant artifact type as appropriate.

## Commit-Time Enforcement

Whimbrel enables commit-time provenance enforcement through both:

- local git hooks via `.githooks/commit-msg` and `scripts/install-hooks.sh`
- CI re-validation via `.github/workflows/commit-standards.yml`

Recommended minimum enforcement:

- reject commits that do not include `project:`, `agent:`, `role:`, and `artifacts:`
- reject roles outside `orchestrator|worker|subagent|operator`
- reject empty or malformed artifact ID lists
- allow explicit bootstrap or migration exceptions

The goal is not perfect policy automation. The goal is to stop obviously non-compliant commits before they land.

## Off-Git Provenance

Repo artifacts stay lightweight on purpose.

In-repo provenance answers:

- what artifact this is
- when it was opened
- which agent wrote the record

The Off-Git runtime should answer:

- which conversation or run the `agent-id` maps to
- whether the agent was top-level or a subagent
- which messages or events produced the artifact
- which commits belong to that `agent-id`

## Legacy Material Policy

- Keep `logs/` intact so existing references remain valid.
- Treat migrated `RSH-*` research memos as the active durable equivalents of the legacy notes.
- Put all new durable work into the active operating surfaces listed above.
