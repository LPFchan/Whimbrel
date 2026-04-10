# RSH-20260409-002: Whimbrel Architecture Review

Opened: 2026-04-09 05-23-17 KST
Recorded by agent: codex-20260409-repo-template-adoption

## Memo Status

- Source before repo-template: `logs/ARCHITECTURE_REVIEW.md` in `b1c0fb9^`
- Legacy archive now: `logs/2-ARCHITECTURE_REVIEW.md`
- Status: reconciled architecture review; research context, not accepted implementation scope
- Scope: architectural bottlenecks, anti-patterns, inefficiencies, and candidate refactor directions
- Reconciliation note: current code has already addressed some legacy findings; each section below names the current status

## Review Position

This memo captures areas for improvement in the Whimbrel codebase. It is diagnostic: any remaining recommendation needs operator acceptance, a decision record where appropriate, and commit-backed execution history before it becomes planned runtime work.

## Finding Status Summary

| Legacy review area | Current reconciled status |
| --- | --- |
| Text serial busy-waiting in `serial.js` | mitigated by `SerialConnection` line resolvers |
| DFU response polling in `dfu.js` | mitigated by response resolvers; response queue remains for already-arrived packets |
| Global singleton serial state | mitigated by instantiable `SerialConnection` |
| Overloaded `firmware.js` | partially mitigated by `api.js` and `firmware-manager.js`; UI controller still coordinates the flow |
| Hardcoded release owner/repo | mitigated by `config.js` plus `api.js` |
| Lack of ES modules | still current |
| DFU buffer/chunk allocation | partially mitigated by preallocated/typed buffers and `subarray()` paths |
| Dashboard / BLE / phone-key complexity | new post-source architecture area; not covered by the legacy review |

## 1. Serial And DFU Async I/O

### Legacy Finding

The original review called out busy-wait / polling loops:

- `serial.js` / `readLineWithTimeout(...)` polled `readBuffer` in a loop with a `setTimeout` fallback.
- `dfu.js` / `receiveResponse(...)` polled `responseQueue` every 10 ms while waiting for the matching opcode.

### Current Status

The current text serial path uses `SerialConnection`. Its background read loop appends text to a buffer and wakes queued line resolvers. `readLineWithTimeout(...)` resolves immediately from complete buffered lines or installs a resolver with a timeout.

The current DFU path uses response resolvers. `startReader()` resolves a matching waiter as response packets arrive. `responseQueue` is still used for valid response packets that arrive before a matching waiter exists.

### Remaining Guidance

- Preserve timeout, cancellation, resolver cleanup, reader cancellation, writer close, and port close behavior when changing serial/DFU internals.
- Keep response-queue fallback unless a replacement proves that early-arriving packets cannot be lost.

## 2. Serial State Encapsulation

### Legacy Finding

The original review called out module-level serial globals: `portRef`, `reader`, `writer`, `readBuffer`, and `readerLoopPromise`.

### Current Status

Current `js/serial.js` exposes an instantiable `SerialConnection` class. Port, reader, writer, text buffer, read loop, and pending line resolvers are instance state.

### Remaining Guidance

- Keep each provisioning operation responsible for its own connection lifecycle.
- Be careful when mixing line-mode provisioning and byte-mode DFU: they intentionally use different wrappers over Web Serial.

## 3. Firmware Flow Coupling

### Legacy Finding

The original review described `initFirmwareTab(...)` as an overloaded function that mixed DOM updates, tab state, GitHub API requests, ZIP parsing, and DFU orchestration.

### Current Status

The release-fetching service now lives in `js/api.js`. Firmware package download/parse lives in `js/firmware-manager.js`. Runtime constants are centralized in `js/config.js`.

`js/firmware.js` is still a UI controller and high-level firmware-flow orchestrator: it owns the current firmware step, selected release, local-file input, release dropdown, progress UI, port request, `DfuFlasher` call, back/popstate behavior, and demo-mode simulation.

### Remaining Guidance

- Prefer small service/helper extraction when it removes a real dependency from `firmware.js`.
- Avoid turning a simple static app into a framework migration unless the operator accepts that direction.
- Keep the user-visible Firmware flow manually testable after each slice.

## 4. Configuration

### Legacy Finding

The original review called out hardcoded release-fetch URLs in `firmware.js`.

### Current Status

Current release fetching goes through `fetchDeviceReleases(...)` in `js/api.js`, and repo/owner-style configuration is centralized in `js/config.js`.

### Remaining Guidance

- Keep device/repo/release settings centralized.
- If firmware assets keep consolidating under Immogen, ensure public README, `SPEC.md`, release-fetching config, and device-side release practice agree.

## 5. ES Modules

### Current Status

Whimbrel still uses ordered global scripts and the `window.Whimbrel` namespace rather than native ES modules.

### Candidate Direction

- Treat native ES module migration as a deliberate architecture project.
- Convert boundaries in thin vertical slices rather than shuffling every file at once.
- Verify GitHub Pages, demo mode, CDN helper loading, theme bootstrap timing, Web Serial, Web Bluetooth, argon2-browser loading, QRious, and browser compatibility before adopting modules.

## 6. DFU Memory And Allocation

### Legacy Finding

The original review warned about SLIP encoding with growable arrays and firmware chunking with copy-producing `.slice()`.

### Current Status

Current `SlipFramer` decodes into a preallocated `Uint8Array`, static `encode(...)` preallocates the worst-case escaped packet, object writes use reusable request buffers for full-size chunks, and firmware/data chunks use `subarray()`.

### Remaining Guidance

- Keep profiling before optimizing further.
- Keep CRC and offset verification exact; do not trade bootloader correctness for allocation micro-optimizations.

## 7. Dashboard / BLE / Phone-Key Complexity

### Current Status

The dashboard/phone-key provisioning system was added after the legacy architecture review. It now includes dynamic overlay HTML, PIN input, slot management, BLE connect/auth/provision commands, key generation animation, phone-key wrapping, QR rendering, direct guest-slot QR paths, demo slot simulation, and a callback entrypoint from the main Keys flow.

### Candidate Direction

- Preserve the split where shared phone-provision crypto/BLE orchestration lives in `prov.js` and the overlay flow lives in `dashboard.js`.
- Consider extracting a small slot-management service only if BLE command/response coordination grows.
- Treat provisioning QR payloads as sensitive while testing or instrumenting the overlay.
- Test no-phone-key setup, existing-phone-key dashboard entry, owner slot, guest slot, QR Done/Close/Back behavior, and demo mode after dashboard changes.

## Routing Guidance

- Keep this document in `research/`.
- Promote remaining architecture directions into `PLANS.md` only after operator acceptance.
- Capture product/architecture decisions in `records/decisions/` before major runtime restructuring.
- Use git commit history via `commit: LOG-*` for the execution history of any accepted refactor.
