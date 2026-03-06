# Whimbrel (Provisioning App)
## Overview

Whimbrel is a client-side, browser-based web application used to securely pair an Uguisu (Key Fob) with a Guillemot (Receiver). It handles the cryptographic generation of the pre-shared AES-128-CCM key and injects it into both devices, alongside synchronizing their anti-replay counters.

**Naming:** Continuing the avian theme (Whimbrel is a migratory wading bird), acting as the bridge that unites the two endpoints.

```text
┌─────────────────┐       USB-C (Web Serial)       ┌──────────────────────┐
│  UGUISU (FOB)   │ <────────────────────────────> │ WHIMBREL (WEB APP)   │
│  XIAO nRF52840  │                                │ Chrome / Edge        │
└─────────────────┘                                └──────────────────────┘
                                                              │
┌─────────────────┐       USB-C (Web Serial)                  │
│ GUILLEMOT (RX)  │ <─────────────────────────────────────────┘
│  XIAO nRF52840  │
└─────────────────┘
```

## Core Architecture

Whimbrel is entirely serverless and offline-capable. It consists of static HTML/CSS/JS hosted on GitHub Pages (or a local file).

### Tech Stack
*   **Frontend:** Vanilla JS or lightweight framework (e.g., Preact/Svelte).
*   **Cryptography:** Web Crypto API (`window.crypto.getRandomValues`) for cryptographically secure pseudorandom number generation (CSPRNG) of the 128-bit key.
*   **Transport:** **Web Serial API** (`navigator.serial`). It communicates natively with the nRF52840's USB CDC (Serial over USB) without requiring drivers on modern OSs.

### Why Web Serial over WebBLE?
1.  **Security:** Requires physical USB-C access. No risk of over-the-air interception or "drive-by provisioning" if the scooter reboots.
2.  **Power Budget:** Uguisu’s strict `sd_power_system_off()` sleep cycle makes persistent BLE pairing modes difficult. USB insertion provides a discrete hardware interrupt (VBUS detection) to wake the MCU and keep it awake for serial communication.

---

## The Provisioning Protocol

Communication between Whimbrel and the MCUs uses simple JSON or delimited strings over 115200 baud serial.

### Payload Specification
Whimbrel sends a configuration payload:
`PROV:<DEVICE_ID>:<128_BIT_HEX_KEY>:<RESET_COUNTER>:<CHECKSUM_HEX>\n`

*   **CHECKSUM_HEX** is 4 hex characters: CRC-16-CCITT (poly 0x1021, init 0xFFFF) over the 16 key bytes. Used to detect transmission errors.

Example:
`PROV:UGUISU_01:4A2B9C8F1E...3D:00000000:a3f2\n`

### Device Responses
*   `ACK:PROV_SUCCESS\n` – Key saved to non-volatile storage (NVS/FDS).
*   `ERR:MALFORMED\n` – Payload didn't match expected length/format.
*   `ERR:CHECKSUM\n` – CRC-16 of received key did not match; retry provisioning.

---

## User Workflow

The UI is designed to be foolproof for a workbench environment:

1.  **Key Generation:** 
    *   User opens Whimbrel.
    *   Clicks **"Generate New Secret"**. 
    *   *App generates a 16-byte random hex string via Web Crypto API.*
2.  **Provision Uguisu:**
    *   User plugs the fob into the PC via USB-C.
    *   Clicks **"Flash Key Fob"**. Browser prompts for Serial Port selection.
    *   Whimbrel pushes the key and sets the anti-replay counter to `0`.
    *   UI shows a green checkmark.
3.  **Provision Guillemot:**
    *   User plugs the receiver board into the PC via USB-C (before installing it in the scooter deck).
    *   Clicks **"Flash Receiver"**. Browser prompts for Serial Port.
    *   Whimbrel pushes the *exact same* key and resets the expected counter to `0`.
    *   UI shows a green checkmark.
4.  **Completion:** Both devices are unplugged. The system is securely paired and ready for deployment.

---

## Firmware Implications (Uguisu & Guillemot)

To support Whimbrel, both devices need a specific "Provisioning Mode" handler in their `setup()` routines.

### VBUS Detection (Entering Provisioning Mode)
The nRF52840 must determine if it is being powered by a battery or by a computer.
*   Check the `NRF_POWER->USBREGSTATUS` register. 
*   If `VBUSDETECT` is high, the device halts its normal boot sequence.
*   It initializes `Serial`, waits for a connection, and enters a `while()` loop listening for the `PROV:` prefix.
*   *Security feature:* If no serial command is received within 30 seconds of USB power, the MCU locks the serial port and continues normal execution or sleeps.

### Non-Volatile Storage (NVS)
Once the key is received, the MCU must write it to flash memory.
*   Use Zephyr NVS or Arduino Core's LittleFS/InternalFS.
*   **Uguisu:** Stores the AES Key (16 bytes) and the current Counter (4 bytes).
*   **Guillemot:** Stores the AES Key (16 bytes) and the Last Seen Counter (4 bytes).
*   Flash wear is not an issue for provisioning, as keys are rarely changed.

---

## Security Considerations for Whimbrel

*   **No Internet Required:** Whimbrel should be a Progressive Web App (PWA). Once loaded, it can be entirely disconnected from the internet. No keys ever leave the local machine.
*   **Ephemeral Memory:** The key only exists in the browser's RAM during the pairing session. Once the browser tab is closed, the key is gone forever. If a device breaks, a *new* key must be generated and flashed to both the surviving device and the replacement device.
*   **Read Protection:** The firmware must *never* implement a serial command to read the key back out (`Serial.print(key)`). The USB connection is strictly Write-Only for the AES key.