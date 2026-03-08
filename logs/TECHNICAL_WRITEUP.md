# Whimbrel — Technical Writeup

A concise technical reference for every part, module, and section of the Whimbrel companion web app (Ninebot G30 BLE immobilizer).

---

## 1. Overview

**Whimbrel** is the browser-based companion app for a three-part immobilizer system:

- **Uguisu** — BLE key fob  
- **Guillemot** — receiver (on the scooter)  
- **Whimbrel** — this web app

It provides:

1. **Firmware flashing** — Nordic Serial DFU over Web Serial (USB CDC), fetching releases from GitHub.  
2. **Key provisioning** — Generate a 128-bit AES key in the browser and inject it into both devices via USB (write-only; key never leaves RAM).

**Tech stack:** Vanilla HTML/CSS/JS, Web Crypto API, Web Serial API. Hosted on GitHub Pages; runs fully offline after load. Requires Chrome, Edge, or Opera (Web Serial).

---

## 2. Project Structure

```
Whimbrel/
├── index.html          # Single-page app shell, tabs, theme init
├── manifest.json       # PWA manifest
├── css/
│   └── style.css       # Layout, theming, components
├── js/
│   ├── app.js          # Main UI, Keys flow, tab orchestration
│   ├── crypto.js       # Key generation, CRC-16, PROV line builder
│   ├── serial.js       # Web Serial open/close, send/read line
│   ├── prov.js         # Provisioning constants, waitForBooted
│   ├── dfu.js          # Nordic Serial DFU (SLIP, CRC32, flasher)
│   └── firmware.js     # Firmware tab: releases, zip parse, flash flow
└── assets/
    ├── guillemot.png   # Receiver tile icon
    └── uguisu.png      # Fob tile icon
```

**Script load order (in `index.html`):** `dfu.js` → `crypto.js` → `serial.js` → `prov.js` → `firmware.js` → inline theme script → `app.js`. No ES modules; supports `file://` if needed.

---

## 3. manifest.json

- **name / short_name:** Whimbrel  
- **description:** Provision Uguisu and Guillemot for the G30 BLE immobilizer.  
- **start_url:** `/Whimbrel/index.html`  
- **display:** standalone  
- **background_color:** `#0d1117`  
- **theme_color:** `#58a6ff`  
- **icons:** empty array (no icons defined).

Used when the app is installed as a PWA.

---

## 4. index.html

### 4.1 Head

- Charset, viewport, description, title.  
- `manifest.json` link.  
- `css/style.css` link.  
- Inline script: restores theme from `localStorage` and/or `prefers-color-scheme: dark`; sets `data-theme="dark"` on `<html>` when appropriate.

### 4.2 Scripts (order matters)

- **External:** canvas-confetti (defer), JSZip.  
- **App:** `js/dfu.js`, `js/crypto.js`, `js/serial.js`, `js/prov.js`, `js/firmware.js`, then `js/app.js`.

### 4.3 Layout

- **Header:** Title “Whimbrel” (click = home in Keys flow), GitHub link, tagline linking to Guillemot/Uguisu.  
- **Unsupported message:** Shown when Web Serial is unavailable (banner with icon and “use Chrome, Edge, or Opera”).  
- **Tabs:** Two tab buttons — **Firmware** (default), **Keys**.  
- **Main panel:** Two tab contents:
  - **tab-keys:** Stepper (1 → 2 → 3), back button, timeout ring, and four steps: Generate Key, Flash Fob, Flash Receiver, “All done” notes.  
  - **tab-firmware:** Step 1 = device tiles (Guillemot / Uguisu); Step 2 = “Enter DFU mode” instructions + Continue; Step 3 = release selector, progress, Flash button.  
- **Footer:** Theme toggle (dark/light) with moon/sun icons.

### 4.4 Inline behavior

- Theme toggle: toggles `data-theme="dark"` and `localStorage.theme`.  
- Listens to `prefers-color-scheme` when no saved theme.

---

## 5. css/style.css

### 5.1 Theming

- **`:root`:** Light theme (e.g. `--bg`, `--surface`, `--text`, `--accent`, `--success`, `--error`, `--radius`, `--shadow`).  
- **`[data-theme="dark"]`:** Dark overrides for same variables.  
- Transitions on `body` and `.main-panel` for theme switch.

### 5.2 Layout

- **body:** Centered flex, full min-height, Inter font.  
- **.layout-wrapper:** Max-width 640px, column flex.  
- **header:** Centered; h1, GitHub link, tagline.  
- **.main-panel:** Card with border, radius, shadow; column flex, overflow hidden.

### 5.3 Components

- **Unsupported message:** Centered text and icon.  
- **Stepper:** Circles 1–2–3, lines between, optional timeout ring (SVG progress circle).  
- **Steps:** `.step`, `.step-visible`, `.step-hidden`, `.step-fading-out`; fade animations.  
- **Buttons:** `.btn-huge` (primary), `.btn-back`, `.btn-tile` (device tiles), `.btn-next` (success).  
- **Status:** `.status`, `.status.success`, `.status.error`.  
- **Key preview:** Container with monospace hex and optional “dots” overlay (blur/reveal).  
- **Notes:** Dashed success box for “All done”.  
- **Instructions list:** Numbered circles + text for DFU steps.  
- **Tabs:** `.tab-btn`, `.tab-btn.active` (underline).  
- **Firmware:** `.device-tiles`, `.btn-tile`, `.device-icon`; `.release-info`, `.release-dropdown`, `.release-item`; `.progress-container`, `.progress-bar`; `.badge-latest`.  
- **Footer:** `.theme-toggle-footer`.

### 5.4 Utilities

- `.step-hidden` = `display: none !important`.  
- `.step-visible` / `.step-fading-out` with `fadeIn` / `fadeOut` keyframes.  
- Progress ring: SVG circle, stroke-dasharray/offset for countdown.

---

## 6. js/crypto.js

**Role:** Key generation and provisioning payload checksum.

- **Constants:** `KEY_LEN_BYTES = 16`, `RESET_COUNTER = "00000000"`.  
- **`generateKey()`:** Fills 16 bytes with `crypto.getRandomValues()`, returns 32-char lowercase hex string.  
- **`crc16Key(keyHex)`:** CRC-16-CCITT (poly 0x1021, init 0xffff) over the 16 bytes of `keyHex`; returns 4-char hex.  
- **`buildProvLine(keyHex)`:** Asserts 32-char key, then returns line:  
  `PROV:<keyHex>:<RESET_COUNTER>:<crc16Hex>\n`  
  (no newline in return value; newline added by serial layer).

Used by the Keys flow to create the exact string sent to the MCU for provisioning.

---

## 7. js/serial.js

**Role:** Web Serial API wrapper for provisioning and DFU (same port open/close/send pattern).

- **State:** `portRef`, `reader`, `writer`, `readBuffer`, `readerLoopPromise`.  
- **`isSupported()`:** Returns `"serial" in navigator`.  
- **`requestPort()`:** `navigator.serial.requestPort()`.  
- **`openPort(port)`:** Opens at **115200** baud; sets up `TextEncoderStream` → `port.writable` (writer) and `port.readable` → `TextDecoderStream` (reader); starts background read loop appending into `readBuffer`.  
- **`sendLine(line)`:** Writes `line + "\n"` via writer.  
- **`readLineWithTimeout(timeoutMs)`:** Polls `readBuffer` for `\n`, returns trimmed line; throws on timeout.  
- **`closePort(port)`:** Cancels reader, releases locks, closes port, clears refs.

Used by both provisioning (prov.js/app.js) and by DFU (dfu.js opens the port itself for DFU baud/pipeline).

---

## 8. js/prov.js

**Role:** Device identifiers, boot strings, timeouts, and “wait for boot” logic.

- **Constants:**
  - `DEVICE_ID_FOB = "UGUISU_01"`, `DEVICE_ID_RX = "GUILLEMOT_01"` (for UI/logic).  
  - `BOOTED_FOB = "BOOTED:Uguisu"`, `BOOTED_RX = "BOOTED:Guillemot"` (expected serial boot lines).  
  - `TIMEOUT_PROV_MS = 12000`, `TIMEOUT_BOOT_MS = 10000`.  
- **`waitForBooted(expectedBooted)`:** Until `TIMEOUT_BOOT_MS`, reads lines with `readLineWithTimeout`. Returns when a line equals `expectedBooted`; throws on `ERR:` or timeout.

Provisioning flow (in app.js) sends `PROV:...`, then calls `waitForBooted` so the device confirms it has booted after storing the key.

---

## 9. js/dfu.js

**Role:** Nordic Serial DFU over Web Serial: SLIP framing, CRC32, and full flash sequence.

### 9.1 Opcodes and types

- Request opcodes: `OP_PROTOCOL_VERSION`, `OP_CREATE_OBJECT`, `OP_SET_PRN`, `OP_CALC_CHECKSUM`, `OP_EXECUTE`, `OP_SELECT_OBJECT`, `OP_MTU_GET`, `OP_WRITE_OBJECT`, `OP_PING`.  
- Response opcode: `OP_RESPONSE = 0x60`.  
- Object types: `OBJ_COMMAND` (init packet), `OBJ_DATA` (firmware).  
- Result: `RES_SUCCESS = 0x01`.

### 9.2 CRC32

- Table-based CRC32 (standard polynomial); used for command and data object checksums.

### 9.3 SlipFramer

- **Decode:** Accumulates bytes; on `0xC0` pushes current packet; `0xDB 0xDC` → `0xC0`, `0xDB 0xDD` → `0xDB`.  
- **Encode (static):** Escapes `0xC0` and `0xDB`, wraps packet with `0xC0` start/end.

### 9.4 DfuFlasher

- **Constructor:** `(port, datBytes, binBytes)` — Web Serial port plus init (.dat) and firmware (.bin) buffers.  
- **startReader():** Pipes `port.readable` through a transform that runs `SlipFramer.append()` and enqueues decoded packets; background loop pushes packets with `OP_RESPONSE` into `responseQueue`.  
- **send(data):** SLIP-encodes and writes to `port.writable`.  
- **receiveResponse(reqOpcode, timeoutMs):** Polls `responseQueue` for matching opcode; on success checks result byte; throws on failure or timeout.  
- **sendCommandAndRead:** Sends single-byte opcode + payload, then receives response.  
- **High-level methods:** `ping()`, `setPRN(0)`, `getMTU()`, `selectObject(type)`, `createObject(type, size)`, `calcChecksum()`, `execute()`, `writeObject(dataChunk)` (chunked by MTU).  
- **flash(onProgress):**  
  1. Opens port 115200, starts reader.  
  2. Ping, set PRN 0, get MTU.  
  3. Command object: select/create/write .dat, checksum, execute.  
  4. Data object: select; loop create/write/checksum/execute per chunk until full .bin sent.  
  5. Calls `onProgress(msg, 0..1)`.  
  6. Cleans up reader and closes port.

Exposed as `window.DfuFlasher` for firmware.js.

---

## 10. js/firmware.js

**Role:** Firmware tab UI and flow: device choice → instructions → release picker → DFU flash.

- **`initFirmwareTab(opts)`:** Receives `{ abortableDelay, animateHeightChange, triggerConfetti }` from app.js. Returns `{ showFwStep, resetFwFlashUI, handleFirmwarePopState, abortFwFlash, isFwFlashing, getFwStepIdx }`.

### 10.1 State

- `fwCurrentStepIdx` (0 = tiles, 1 = instructions, 2 = flash screen).  
- `fwSelectedDeviceName` (“Guillemot” | “Uguisu”).  
- `fwFlashingInProgress`, `fwFlashAborted`.  
- `latestFwZipUrl`, `latestFwZipBuffer`, `allReleases`.

### 10.2 Steps

- **Step 0:** Device tiles; clicking Guillemot or Uguisu sets name, pushes step 1, fetches releases from `https://api.github.com/repos/LPFchan/Guillemot|Uguisu/releases`.  
- **Step 1:** “Enter DFU mode” instructions (USB, double-tap reset, USB drive); Continue → step 2.  
- **Step 2:** Title “Flashing Guillemot|Uguisu”, release dropdown (from `allReleases`), progress bar, Flash button.

### 10.3 Release handling

- **fetchReleases(repoName):** GET GitHub API; filters releases with .zip assets; `selectRelease(allReleases[0], true)`; builds dropdown.  
- **selectRelease(releaseData, isLatest):** Sets `latestFwZipUrl` from asset `browser_download_url`; clears `latestFwZipBuffer`; updates release info UI and enables Flash.

### 10.4 Flash flow

- User clicks Flash → `requestPort()`; if no URL, error.  
- Download zip if not cached (`latestFwZipBuffer`).  
- JSZip: read `manifest.json`, then `manifest.manifest.application.dat_file` / `bin_file`; load .dat and .bin as `Uint8Array`.  
- `new DfuFlasher(port, datBytes, binBytes).flash(callback)` with progress 0.2 → 1.0.  
- On success: success message + “Flash [other device]” link, confetti.  
- Back link on step 2 calls `showFwStep(0)`.

### 10.5 Navigation and abort

- Back buttons use `history.back()` or confirm if flashing.  
- `handleFirmwarePopState`: if user goes back while flashing, pushes state back and optionally confirms abort.  
- `abortFwFlash` sets `fwFlashAborted` and resets UI.

---

## 11. js/app.js

**Role:** Main orchestration: Web Serial check, tab switching, Keys flow (generate → flash fob → flash receiver → done), and shared UI helpers.

### 11.1 State

- **Keys:** `currentKey` (32-char hex or null), `fobFlashed`, `receiverFlashed`.  
- **Flow:** `currentStepIdx` (0–3), `keysProvisioningInProgress`, `keysProvisionAborted`, `keysGenerationInProgress`, `keysGenerationAborted`, etc.

### 11.2 Initialization

- DOM refs for main panel, tabs, Keys steps, stepper, status elements, buttons.  
- `initFirmwareTab(...)` called with `abortableDelay`, `animateHeightChange`, `triggerConfetti`; app stores `showFwStep`, `resetFwFlashUI`, `handleFirmwarePopState`, `abortFwFlash`, `isFwFlashing`, `getFwStepIdx`.  
- Initial history: `replaceState({ tab: "firmware", fwStep: 0 }, "#firmware-step1")`.  
- If `!isSupported()`, hide main panel and tabs, show unsupported message.

### 11.3 Helpers

- **animateHeightChange(callback):** Locks panel height, runs callback, animates to new height (or instant if same).  
- **abortableDelay(ms, shouldAbort):** Resolves after `ms` or when `shouldAbort()` is true.  
- **triggerConfetti():** Left/right confetti if `window.confetti` exists.  
- **showStep(stepIndex, pushStateFlag):** Keys flow step 0–3; updates history, fades out current, updates stepper and visibility of generate / flash fob / flash receiver / notes.  
- **runTimeout(containerEl, circleEl, ms, shouldAbort):** Shows progress ring and runs countdown; can be aborted.

### 11.4 Keys flow — Generate

- **setKey(key):** Sets `currentKey`, enables/disables Flash Fob and Flash Receiver.  
- **Generate click:** Clears status, resets fob/receiver flashed state, calls `generateKey()` (crypto.js). On error shows error status. Then `animateKeyGeneration(key)`: fade out, show “Creating a new AES-128 key...”, scramble animation (random hex building to 32 chars), then reveal key as dots, set key, 1.5s timeout ring, then `showStep(1)`.

### 11.5 Keys flow — Provision

- **provisionDevice(deviceId, setStatus, expectedBooted):**  
  - Ensures `currentKey` and Web Serial.  
  - `requestPort()` → `openPort(port)` → `buildProvLine(currentKey)` → `sendLine(line)` → `readLineWithTimeout(TIMEOUT_PROV_MS)`.  
  - Expects `ACK:PROV_SUCCESS`; else shows ERR.  
  - Then `waitForBooted(expectedBooted)` (prov.js).  
  - On success: if fob, sets `fobFlashed`, 1.5s timeout, then `showStep(2)`; if receiver, sets `receiverFlashed`.  
  - If both fob and receiver flashed and current step is 2, goes to step 3 and triggers confetti.  
  - Always closes port in `finally`.

### 11.6 Tab switching

- **popstate:** Restores tab (firmware vs keys) and step from `history.state`.  
- Tab button click: if firmware flashing or keys provisioning, confirm (or abort) before switch.  
- Keys tab: when switching to Keys and already on Keys, `resetKeysUI()` (clear key, statuses, go to step 0).  
- Firmware tab: when switching to Firmware and already there, `resetFwFlashUI` and `showFwStep(0)`.  
- History updated per tab (`#stepN` or `#firmware-stepN`).

### 11.7 Back / Home

- Back button: `history.back()`.  
- Home (title) click: if step > 0, push state and `showStep(0)`.

---

## 12. Provisioning Protocol (Summary)

- **Line sent (115200 baud):**  
  `PROV:<32_hex_key>:00000000:<4_hex_crc16>\n`  
- **CRC:** CRC-16-CCITT over the 16-byte key.  
- **Device replies:**  
  - Success: `ACK:PROV_SUCCESS\n`  
  - Errors: `ERR:MALFORMED\n`, `ERR:CHECKSUM\n`, `ERR:STORAGE\n`  
- After ACK, device reboots and sends boot string, e.g. `BOOTED:Uguisu\n` or `BOOTED:Guillemot\n`; Whimbrel waits for that in `waitForBooted`.

Key is ephemeral: generated in RAM, sent over USB only, never persisted by the app.

---

## 13. Data and Control Flow Summary

| Area            | Inputs / Triggers     | Outputs / Side effects                          |
|-----------------|------------------------|--------------------------------------------------|
| crypto.js       | `generateKey()`, key hex | 32-char hex key; PROV line with CRC             |
| serial.js       | `requestPort`, `openPort`, `sendLine`, `readLineWithTimeout` | Port open/close, line I/O                      |
| prov.js         | `waitForBooted(expectedBooted)` | Return when boot line seen or throw            |
| dfu.js          | Port, .dat, .bin; `DfuFlasher.flash(onProgress)` | DFU commands/responses; firmware written        |
| firmware.js     | Device choice, release choice, Flash click | GitHub fetch, zip parse, DFU flash, progress UI |
| app.js          | Tab clicks, Generate, Flash Fob/Receiver, Back | Steps, history, status, confetti, port lifecycle |

---

*End of technical writeup.*
