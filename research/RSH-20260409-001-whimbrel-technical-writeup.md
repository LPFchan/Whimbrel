# RSH-20260409-001: Whimbrel Technical Writeup

Opened: 2026-04-09 05-23-16 KST
Recorded by agent: codex-20260409-repo-template-adoption

## Memo Status

- Source before repo-template: `logs/TECHNICAL_WRITEUP.md` in `b1c0fb9^`
- Legacy archive now: `logs/1-TECHNICAL_WRITEUP.md`
- Status: reconciled technical reference; research context, not a decision record
- Scope: runtime structure, operator flows, module roles, serial/BLE/DFU/provisioning data flow
- Reconciliation note: the legacy source predates dashboard / phone-key / BLE work, demo-mode simulation, config/API/firmware-manager extraction, the `SerialConnection` class, and several DFU transport improvements

## Overview

Whimbrel is the browser-based companion app for a three-part Ninebot G30 BLE immobilizer system:

- Uguisu: BLE key fob
- Guillemot: receiver on the scooter
- Whimbrel: this web app

Current Whimbrel includes three browser-facing maintenance/provisioning areas:

1. Firmware flashing: Nordic Serial DFU over Web Serial / USB CDC, with release ZIPs fetched from GitHub.
2. Fob/receiver key provisioning: generate a 128-bit AES key in browser memory and inject it into Uguisu and Guillemot over USB with a write-only serial protocol.
3. Phone-key provisioning and management: connect to the management service with Web Bluetooth, derive PIN-based wrapping material, provision phone-key slots, and show QR payloads for Pipit.

Runtime stack: vanilla HTML/CSS/JS, Web Crypto API, Web Serial API, Web Bluetooth, JSZip, aes-js, argon2-browser, QRious, and canvas-confetti. The default public host is GitHub Pages.

## Current Project Structure

```text
Whimbrel/
├── index.html
├── manifest.json
├── css/
│   └── style.css
├── js/
│   ├── api.js
│   ├── app.js
│   ├── ble.js
│   ├── ccm.js
│   ├── config.js
│   ├── crypto.js
│   ├── dashboard.js
│   ├── dfu.js
│   ├── firmware-manager.js
│   ├── firmware.js
│   ├── prov.js
│   └── serial.js
└── assets/
    ├── guillemot.png
    └── uguisu.png
```

The legacy source described a smaller runtime with `app.js`, `crypto.js`, `serial.js`, `prov.js`, `dfu.js`, and `firmware.js`. Current code keeps the static/no-build shape but has split API and firmware-package work out of `firmware.js`, moved constants into `config.js`, introduced a `window.Whimbrel` namespace, added BLE/dashboard surfaces, and changed text serial I/O to an instantiable connection object.

## App Shell And Script Loading

`index.html` owns the single-page app shell:

- document metadata, manifest link, stylesheet link
- inline theme bootstrap using saved `localStorage.theme` plus `prefers-color-scheme`
- CDN dependencies: canvas-confetti, JSZip, aes-js, argon2-browser, QRious
- demo-mode flag on the `demo` branch via `window.WHIMBREL_DEMO = true`
- header with Whimbrel title, GitHub link, Immogen tagline, and demo badge when enabled
- unsupported-browser banner for browsers without required device APIs
- Firmware and Keys tabs
- dashboard overlay mount point populated by `js/dashboard.js`
- main Keys flow for generating a fob/receiver key, flashing fob, flashing receiver, optional phone-key add, PIN/QR, and completion
- firmware flow for device choice, bootloader instructions, release choice, local-file option, flash progress
- footer theme toggle

Script order matters because the app uses globals rather than ES modules:

```text
config.js -> crypto.js -> ccm.js -> serial.js -> ble.js -> prov.js
-> api.js -> firmware-manager.js -> dfu.js -> firmware.js
-> dashboard.js -> app.js
```

## Runtime Module Map

`js/config.js` creates `window.Whimbrel`, detects demo mode, and centralizes GitHub owner/repo, baud rate, key length, reset counter, device IDs, boot strings, provisioning/boot timeouts, DFU MTU, and DFU buffer size.

`js/api.js` fetches GitHub release metadata. In demo mode it returns a static ZIP-bearing release list.

`js/firmware-manager.js` downloads a release ZIP if needed, reads `manifest.json` with JSZip, locates the application `.dat` and `.bin`, and returns firmware bytes plus the cached ZIP buffer.

`js/crypto.js` owns random 16-byte key generation, a retained CRC-16-CCITT helper, and current serial provisioning line construction.

`js/ccm.js` owns AES-CCM encryption helper logic and hex/buffer conversion helpers used by phone-key provisioning.

`js/serial.js` exposes `requestPort()` and `SerialConnection`. A `SerialConnection` owns its port, reader, writer, text read buffer, background read loop, and queued line resolvers.

`js/ble.js` exposes `BLEManager`, which requests a Web Bluetooth device, discovers command/response characteristics, subscribes to response notifications, writes text commands, and disconnects from GATT.

`js/prov.js` exposes `provisionPhone(...)` and `waitForBooted(...)`. Phone provisioning can reuse a caller-provided BLE manager and key; it derives an Argon2id PIN hash, encrypts/wraps the phone key with AES-CCM, sends optional `SETPIN:<pin>`, sends the BLE `PROV:<slot>:<key>:0:` command, and returns the Pipit QR URL plus key hex.

`js/dfu.js` exposes `DfuFlasher`, a Nordic Serial DFU implementation with SLIP framing, CRC32, response resolvers, checksum verification, command-object transfer, data-object transfer, progress callbacks, and final stream/port cleanup.

`js/firmware.js` exposes `initFirmwareTab(opts)` and owns firmware-tab UI state, device choice, release dropdown, local firmware package input, progress UI, Web Serial port request, `DfuFlasher` orchestration, abort/back handling, and demo-mode flash simulation.

`js/dashboard.js` owns the Manage Keys overlay: connect / no-phone-key tutorial, phone-key auth PIN, slot listing, rename/revoke/provision actions, key-generation animation, owner/no-fob PIN setup, BLE provisioning handoff, QR rendering, demo slot simulation, and `window.Whimbrel.openForProvisioning(onDone)` for the main Keys flow.

`js/app.js` owns app initialization, Web Serial support messaging, tabs, browser history, height/step animations, timeout rings, confetti, the main fob/receiver Keys flow, serial provisioning, optional phone-key prompt, QR/PIN surfaces used by the main flow, dashboard opening, and coordination with `initFirmwareTab(...)`.

## Fob / Receiver Serial Provisioning

Current serial line payload:

```text
PROV:<slot>:<32_hex_key>:<counter>:<name>\n
```

The legacy form was:

```text
PROV:<32_hex_key>:00000000:<4_hex_crc16>\n
```

Current notes:

- transport baud rate is centralized as `CONFIG.BAUDRATE` / 115200
- `js/app.js` currently calls `buildProvLine(0, currentKeys.fobKey, CONFIG.RESET_COUNTER, "Uguisu"|"Owner")` for the main fob/receiver serial path
- the fob/receiver key is generated in RAM and passed through the active Keys flow
- text serial I/O goes through a `SerialConnection`
- the app waits for `ACK:PROV_SUCCESS`
- after ACK, the device is expected to reboot and emit `BOOTED:Uguisu` or `BOOTED:Guillemot`
- known line-level provisioning errors include malformed/checksum/storage-style errors from the device
- generated fob/receiver keys should never be logged or persisted

## Phone-Key / Dashboard Provisioning

Owner/no-phone-key phone provisioning:

1. User opens the dashboard path or chooses to add a phone key from the main flow.
2. User connects over BLE, or demo-mode manager is used on the demo branch.
3. User generates a key for a target slot.
4. User enters a 6-digit PIN where that flow requires one.
5. `provisionPhone(...)` derives an Argon2id hash from the PIN and a random 16-byte salt.
6. The phone key is encrypted/wrapped with AES-CCM and a nonce derived from the salt.
7. When first setting up, Whimbrel sends `SETPIN:<pin>`.
8. Whimbrel sends `PROV:<slot>:<phoneKeyHex>:0:` to the connected BLE manager.
9. Whimbrel renders an `immogen://prov?...salt=...&ekey=...` QR URL for Pipit.

Guest/direct slot QR flow in the dashboard can currently render an `immogen://prov?...key=<generatedKeyHex>...` URL. Treat displayed QR codes as sensitive.

## Nordic Serial DFU

DFU flashing in `js/dfu.js`:

1. Open the selected Web Serial port with configured baud/buffer size.
2. Start a SLIP reader.
3. Ping the bootloader, set PRN to 0, and read MTU when available.
4. Select/create/write the command object from the `.dat` init packet.
5. Calculate and verify command CRC32, then execute.
6. Select/create/write data objects from the `.bin` firmware, chunked by bootloader max object size.
7. Calculate and verify offset/CRC for each object, execute it, report progress, and close/cancel streams in `finally`.

Current implementation note: the legacy memo described array-heavy SLIP/write paths and response polling. Current `js/dfu.js` now uses preallocated / `Uint8Array` buffers, `subarray()` chunking, and response resolvers. It still keeps a response queue for responses that arrive before a matching waiter exists.

## Data And Control Flow Summary

| Area | Inputs / triggers | Outputs / side effects |
| --- | --- | --- |
| `config.js` | branch/app bootstrap | shared namespace, runtime constants, demo-mode state |
| `api.js` | device/repo name | GitHub release list or demo release list |
| `firmware-manager.js` | ZIP URL or cached buffer | `.dat`, `.bin`, cacheable array buffer |
| `crypto.js` | generate click / provisioning request | key hex, CRC-16, serial `PROV:` line |
| `ccm.js` | key/nonce/message buffers | AES-CCM encrypted bytes |
| `serial.js` | requested browser port, serial line | serial connection lifecycle, send/read text lines |
| `ble.js` | requested Bluetooth device, management command | GATT connection, command writes, response notifications |
| `prov.js` | expected boot string | confirmation that provisioned serial device rebooted |
| `prov.js` | PIN / slot / optional BLE manager / optional key | BLE provision command, optional SETPIN, QR URL data |
| `dfu.js` | serial port, init packet, firmware binary | Nordic DFU commands, firmware written, progress callbacks |
| `firmware.js` | device choice, release/local package choice, Flash click | release/package load, DFU orchestration, firmware UI |
| `dashboard.js` | manage-keys click, tutorial, PIN entry, slot actions | overlay UI, slot state, BLE management commands, QR image |
| `app.js` | tab clicks, Generate, Flash Fob/Receiver, Add Phone Key, Back | app state, step navigation, statuses, key session, dashboard handoff, confetti, port lifecycle |

## Legacy Source Value

The original `logs/TECHNICAL_WRITEUP.md` was a repo-native walkthrough rather than a research form. Its most useful surviving contributions are the module-map style, the precise protocol/DFU vocabulary, the reminder that script order matters, and the end-to-end data-flow table.

Where this reconciled memo conflicts with `logs/1-TECHNICAL_WRITEUP.md`, prefer this memo for current active-module shape and consult the legacy archive for historical detail.

## Maintenance Notes

- Use `SPEC.md` for durable product truth and this memo for lower-level runtime/module context.
- Keep the static root deployment shape unless a future `DEC-*` record changes it.
- Keep ordered script loading and the `window.Whimbrel` namespace in mind when editing globals.
- Treat serial payloads, BLE commands that carry generated keys, and provisioning QR URLs as sensitive.
- Test both real-device mode and demo mode when editing flows that are simulated on the `demo` branch.
