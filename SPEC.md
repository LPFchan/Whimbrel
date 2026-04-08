# Whimbrel Spec

This file is the canonical statement of what Whimbrel is supposed to be.
Keep it durable. Do not use it as a changelog, inbox, or weekly narrative.

## Identity

- Project: Whimbrel
- Canonical repo: `https://github.com/LPFchan/Whimbrel`
- Project id: `whimbrel`
- Operator: `LPFchan`
- Last updated: `2026-04-09`
- Related decisions: `DEC-20260409-001`

## Product Thesis

Whimbrel is the browser-based companion app for the Ninebot G30 immobilizer system built around the Uguisu key fob and Guillemot receiver. It exists to let the operator update device firmware and provision a shared AES-128-CCM secret from a supported desktop browser without adding a backend, desktop installer, or over-the-air pairing surface.

## Primary User And Context

- Primary operator: the owner or maintainer of a Whimbrel-managed scooter setup
- Primary environment: a Chromium-class desktop browser with USB-C access to Uguisu or Guillemot
- Primary problem being solved: safe local firmware flashing and secure write-only secret provisioning
- Why this matters: the immobilizer depends on synchronized device firmware and a shared secret that should only be set with direct physical access

## Primary Workspace Object

The main user-facing object is a provisioning or firmware-update session for a Guillemot receiver and/or an Uguisu fob.

## Canonical Interaction Model

1. Open Whimbrel from GitHub Pages or another static host in a supported Chromium browser.
2. Choose either the firmware flow or the key-provisioning flow.
3. Connect the target device over USB and grant Web Serial access.
4. Either fetch firmware release data or generate a new secret in browser memory.
5. Send the DFU payload or provisioning payload to the device and wait for success or error feedback.
6. Repeat for the companion device when pairing both sides of the immobilizer.
7. End the session; the generated secret is not persisted once the tab is closed.

## Core Capabilities

- Capability: Browser-based firmware flashing for Guillemot and Uguisu
  - Why it exists: keep device firmware up to date without a separate native tool
  - What must remain true: the app can fetch release metadata and guide the operator through Web Serial DFU
- Capability: Secure key generation and provisioning
  - Why it exists: pair the receiver and fob with a shared secret using physical access only
  - What must remain true: secrets are generated in-browser, sent over USB, and not stored in repo or backend services
- Capability: Guided operator flow
  - Why it exists: reduce mistakes during flashing and provisioning
  - What must remain true: the UI stays understandable for manual browser-based operation on desktop hardware

## Invariants

- Whimbrel remains a static web app deployable from the repo root on GitHub Pages.
- Provisioning relies on USB/Web Serial rather than OTA or BLE-based secret setup.
- The generated secret is ephemeral browser memory for the current session and is not intentionally persisted by Whimbrel.
- Shared protocol and broader device firmware ownership live outside this repo, especially in Immogen.

## Non-Goals

- Providing a backend service or cloud synchronization layer
- Replacing the firmware/device repos that own shared embedded logic
- Supporting browsers that lack the Web Serial capability required by the provisioning and DFU flows

## Main Surfaces

- Surface: `index.html`, `css/`, `js/`, `assets/`, `manifest.json`
  - Purpose: the user-facing static web app
  - Notes: runtime architecture remains vanilla HTML/CSS/JavaScript served from repo root
- Surface: `README.md`
  - Purpose: public-facing introduction and usage instructions
  - Notes: useful for external readers; not the canonical operations layer
- Surface: `SPEC.md`, `STATUS.md`, `PLANS.md`, `INBOX.md`, `research/`, `records/`
  - Purpose: repo-native truth, planning, research, decisions, and work history
  - Notes: governs future maintenance without changing the deployed runtime on its own

## Success Criteria

- Operators can flash the latest Guillemot and Uguisu firmware from a supported browser.
- Operators can generate and provision a new shared secret without Whimbrel persisting that secret after the session ends.
- Future maintainers can understand what Whimbrel is, what is true right now, and what has been decided without reconstructing context from chat or scattered notes.
