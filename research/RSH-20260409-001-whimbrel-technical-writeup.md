# RSH-20260409-001: Whimbrel Technical Writeup

Opened: `2026-04-09 05-23-16 KST`
Recorded by agent: `codex-20260409-repo-template-adoption`

## Metadata

- Source: legacy `logs/1-TECHNICAL_WRITEUP.md`
- Scope: runtime structure, operator flows, and deployment shape
- Status: migrated from legacy notes into the active research layer

## Research Question

What durable technical context should future maintainers know before changing Whimbrel?

## Why This Belongs To This Repo

Whimbrel is a static operational tool with hardware-facing flows. Future maintenance needs a concise technical reference that outlives chat history and scattered notes.

## Findings

- Whimbrel is the static web companion app for the Uguisu key fob and Guillemot receiver in the Ninebot G30 immobilizer system.
- The runtime stack is intentionally simple: vanilla HTML, CSS, and JavaScript served from the repo root, with GitHub Pages as the default host.
- Firmware flashing is handled in-browser through Web Serial and Nordic Serial DFU.
- Provisioning uses a write-only serial payload built from a browser-generated AES-128-CCM secret, a counter, and a CRC-16 checksum.
- The generated secret only exists in browser memory for the active session; the intended operating model is "generate, flash both devices, then let the tab close."
- The UI is organized as one static shell with a firmware tab and a key-provisioning tab.
- External runtime dependencies currently include JSZip and canvas-confetti from CDNs.
- The app assumes a supported Chromium browser because Web Serial is required for the main device workflows.

## Promising Directions

- Use this memo as the baseline reference when evaluating future runtime refactors.
- Keep `SPEC.md` and `STATUS.md` short by linking back to this memo for implementation-level context.
- If future test or build tooling is introduced, preserve the static-root deployment shape unless a new decision explicitly changes it.

## Dead Ends Or Rejected Paths

- This memo does not approve any runtime changes by itself.
- It should not be used as a substitute for a `LOG-*` worklog when implementation work starts.

## Recommended Routing

- Keep durable product truth in `SPEC.md`.
- Keep current operational reality in `STATUS.md`.
- Use future `DEC-*` and `LOG-*` artifacts for runtime changes that rely on this technical context.
