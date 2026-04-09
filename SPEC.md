# Whimbrel Spec

Durable product and system truth for Whimbrel.

## Identity

- Project: Whimbrel
- Canonical repo: `https://github.com/LPFchan/Whimbrel`
- Project id: `whimbrel`
- Operator: `LPFchan`
- Last updated: `2026-04-09`
- Related decisions: `DEC-20260409-001`

## System Context

Whimbrel is the browser-based companion web app for a three-part Ninebot Max G30 immobilizer system:

- Uguisu: BLE key fob
- Guillemot: scooter-side receiver
- Whimbrel: this static web app

Shared embedded protocol and cryptography logic live outside this repo in the Immogen/Guillemot/Uguisu firmware family. Whimbrel owns the operator-facing browser workflow for flashing firmware, provisioning fob/receiver secrets, and managing phone-key provisioning handoff.

## What Whimbrel Does

Whimbrel has three primary runtime areas.

### Firmware Flashing

Whimbrel fetches firmware release data from GitHub, downloads a Nordic DFU release ZIP, extracts the `.dat` and `.bin` payloads in the browser, and flashes Uguisu or Guillemot over USB/Web Serial with Nordic Serial DFU.

The operator-facing flow is:

1. Open Whimbrel from GitHub Pages or another static host.
2. Choose the Firmware tab.
3. Choose Guillemot receiver or Uguisu fob.
4. Put the device into bootloader mode.
5. Grant the browser access to the bootloader serial port.
6. Wait for the DFU transfer to finish.

### Fob / Receiver Key Provisioning

Whimbrel generates a new 128-bit AES key in browser memory and sends write-only provisioning lines over USB CDC to the Uguisu fob and Guillemot receiver.

Current serial provisioning payloads are built by `buildProvLine(slot, keyHex, ctr, name)`. The line shape is:

```text
PROV:<slot>:<32_hex_key>:<counter>:<name>
```

At the serial layer this is sent at 115200 baud with a line ending. Expected device outcomes include `ACK:PROV_SUCCESS` or an `ERR:...` line, followed on success by a boot string such as `BOOTED:Uguisu` or `BOOTED:Guillemot`. The legacy provisioning note documented an earlier CRC-bearing line shape; do not assume that older shape without checking current firmware/protocol.

The fob/receiver operator flow is:

1. Generate a secret in the Keys tab.
2. Plug Uguisu into the computer over USB-C and flash the key fob.
3. Plug Guillemot into the computer over USB-C and flash the receiver.
4. Optionally continue into phone-key provisioning.
5. Finish the session; the fob/receiver secret is not recoverable from Whimbrel after the tab closes.

### Phone-Key / Dashboard Provisioning

Whimbrel also contains a key-management dashboard overlay for phone-key slots. It can connect over Web Bluetooth to the management service exposed by the immobilizer system, display or manage device slots, generate an additional AES-128 key for a slot, derive PIN-based wrapping material with Argon2id for owner-phone setup, render an `immogen://...` QR payload for the Pipit phone app, and use BLE commands such as auth/provision/rename/revoke depending on the flow.

The first-time no-phone-key flow is entered from the main Keys path; the dashboard can also be opened from the app shell as Manage Keys.

## Security And Device-Access Boundary

- Firmware flashing and fob/receiver provisioning use physical USB access.
- Phone-key and dashboard operations may use an explicit Web Bluetooth management connection, a short physical provisioning window, a PIN step, and/or a QR handoff to Pipit.
- Generated AES-128 keys exist in browser RAM for the active provisioning session.
- QR payloads and BLE provisioning commands are sensitive operator-facing provisioning materials; do not log, persist, or publish real payloads.
- Whimbrel should not store generated secrets in the repo, backend services, browser storage, logs, analytics, or ordinary navigation URLs.
- Firmware is expected to expose no serial command for reading a provisioned key back.
- If one paired device is replaced, a new secret should be generated and provisioned to both the surviving device and the replacement.

## Runtime And Hosting Boundary

- Whimbrel is a static HTML/CSS/JavaScript app served from the repo root.
- There is no required bundler, build step, backend, account system, or database.
- The runtime stack is vanilla HTML/CSS/JS, Web Crypto, Web Serial, Web Bluetooth, JSZip, aes-js, argon2-browser, QRious, canvas-confetti, and browser-native streams/serial/BLE APIs.
- The default public deployment target is GitHub Pages.
- Once loaded, the app is intended to run entirely in the browser.
- Primary supported browsers are supported Chromium-family desktop browsers with the required Web Serial / Web Bluetooth capabilities. Browsers without those APIs cannot perform the corresponding device flows.

## Current App Surfaces

- `index.html`: single-page app shell, tabs, dashboard overlay mount, root markup, theme initialization, ordered script loading, demo-mode flag on the `demo` branch
- `manifest.json`: PWA manifest
- `css/style.css`: layout, themes, components, stepper/progress/status styling
- `js/config.js`: Whimbrel namespace, demo-mode detection, runtime constants
- `js/api.js`: GitHub release-fetching service with demo-mode release data
- `js/firmware-manager.js`: firmware ZIP download / manifest / binary extraction
- `js/app.js`: tab switching, main Keys flow, phone-key prompt handoff, history integration, shared UI helpers
- `js/dashboard.js`: Manage Keys overlay, phone-key slot UI, no-phone-key tutorial, PIN and QR handoff flow
- `js/crypto.js`: AES-key generation, CRC-16, provisioning line construction
- `js/ccm.js`: AES-CCM helper / buffer conversion surface used by phone-key provisioning
- `js/ble.js`: Web Bluetooth manager for the management command/response characteristics
- `js/serial.js`: Web Serial request helper and `SerialConnection` class for line-mode serial I/O
- `js/prov.js`: phone provisioning helper plus serial boot-wait helper
- `js/dfu.js`: Nordic Serial DFU framing, checksums, object transfer, flashing sequence
- `js/firmware.js`: firmware-tab UI, device/release/local-file choice, flash UI orchestration, DFU handoff
- `assets/`: user-facing device imagery

## Non-Goals

- Backend service or cloud synchronization layer
- A way to recover or read back provisioned secrets
- Replacement for the firmware/device repos that own shared embedded logic
- Mandatory build-only deployment path
- Main-flow support for browsers that cannot expose the required Web Serial / Web Bluetooth device APIs

## Safety And Legal Posture

- This is a prototype security/power-interrupt device workflow; use at your own risk.
- Whimbrel is not affiliated with Segway-Ninebot.
- Do not test lock or immobilizer behavior while riding.

## Success Criteria

- Operators can flash current Guillemot and Uguisu firmware from a supported desktop browser.
- Operators can generate one shared fob/receiver secret and provision both devices over direct USB without Whimbrel persisting the secret.
- Operators can complete the accepted phone-key path when the BLE provisioning window, PIN/QR handoff, and Pipit-side scan are available.
- The static GitHub Pages deployment remains understandable and recoverable from the repo root.
- Future maintainers can separate durable product truth, current status, accepted plans, research, decisions, and execution history without reconstructing context from chat.
