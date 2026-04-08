# Whimbrel Plans

This document contains accepted future direction only.
Do not put raw brainstorms or untriaged intake here.

## Planning Rules

- Only accepted future direction belongs here.
- Plans should be specific enough to guide execution later.
- Product or architecture rationale should link to `DEC-*` records when relevant.
- When a plan becomes current truth, reflect it into `SPEC.md` or `STATUS.md` and update this file.

## Approved Directions

### Use Repo-Native Routing And Provenance For Future Maintenance

- Outcome: future Whimbrel work lands in the correct artifact layer and post-bootstrap commits carry the documented provenance trailers
- Why this is accepted: the repo now has a defined operating model and should use it consistently
- Expected value: less context loss, fewer ad hoc notes, and clearer repo history for future maintainers and agents
- Preconditions: contributors follow `repo-operating-model.md` and the local orchestrator skill
- Earliest likely start: immediately after bootstrap adoption
- Related ids: `DEC-20260409-001`, `LOG-20260409-001`

### Triage Existing Architecture Research Before Approving Runtime Refactors

- Outcome: architecture-review findings are either promoted into explicit decisions and implementation plans or left as research only
- Why this is accepted: the repo already has reusable architecture findings, but they are not yet approved implementation scope
- Expected value: separates speculative refactor ideas from accepted runtime work
- Preconditions: operator review of `RSH-20260409-002`
- Earliest likely start: after the operating layer is in regular use
- Related ids: `RSH-20260409-002`

## Sequencing

### Near Term

- Initiative: use `DEC-*`, `LOG-*`, and commit trailers on the next non-bootstrap repo changes
  - Why now: the operating model only helps if future work follows it immediately
  - Dependencies: `DEC-20260409-001`, `repo-operating-model.md`
  - Related ids: `DEC-20260409-001`, `LOG-20260409-001`
- Initiative: review the architecture-research memo and decide whether to accept any refactor work
  - Why now: current risks are documented, but no runtime refactor direction has been approved yet
  - Dependencies: operator time and `RSH-20260409-002`
  - Related ids: `RSH-20260409-002`

### Mid Term

- Initiative: create explicit decisions and worklogs before undertaking major runtime restructuring
  - Why later: runtime architecture changes should be deliberate rather than folded into opportunistic fixes
  - Dependencies: accepted operator decision on scope and timing
  - Related ids: `RSH-20260409-002`

### Deferred But Accepted

- Initiative: activate an `upstream-intake/` subsystem only if Whimbrel starts running recurring upstream review
  - Why deferred: the repo is not currently a fork or cadence-driven upstream-tracking project
  - Revisit trigger: operator adopts a recurring upstream compatibility or change-review workflow
  - Related ids: `DEC-20260409-001`
