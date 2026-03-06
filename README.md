# Whimbrel — Ninebot G30 BLE Immobilizer Provisioning App

Whimbrel is the **provisioning web app** module of a three-part immobilizer system (Uguisu fob + Guillemot receiver + Whimbrel web app) for the Ninebot Max G30. Whimbrel handles the cryptographic generation of a pre-shared AES-128-CCM key and securely injects it into both hardware devices over USB.

This repository contains the **Whimbrel static web app**.

## Hardware / Tech Stack

- **Frontend**: Vanilla HTML / CSS / JavaScript
- **Cryptography**: Web Crypto API (`window.crypto.getRandomValues`) for CSPRNG 128-bit key generation
- **Transport**: Web Serial API (`navigator.serial`) via USB CDC
- **Hosting**: GitHub Pages (or local `file://`)

## Usage

Whimbrel is completely serverless and offline-capable. Once loaded in Chrome or Edge, it runs entirely in the browser.

1. **Generate Secret**: Click "Generate New Secret" to create a random 16-byte hex string in RAM.
2. **Flash Uguisu**: Plug the Uguisu fob into the PC via USB-C and click "Flash Key Fob". The browser prompts for the serial port.
3. **Flash Guillemot**: Plug the Guillemot receiver into the PC via USB-C and click "Flash Receiver". Select its serial port.
4. **Completion**: Both devices are synchronized with the same AES key and counter. The system is securely paired.

## Provisioning & Protocol

Whimbrel uses the Web Serial API because it requires physical USB-C access, eliminating the risk of over-the-air pairing interception. The nRF52840's VBUS detection wakes the MCU from strict sleep to handle the serial configuration.

### Serial Payload
Whimbrel sends a delimited string to the MCU at 115200 baud:
`PROV:<DEVICE_ID>:<128_BIT_HEX_KEY>:<RESET_COUNTER>:<CHECKSUM_HEX>\n`

Example: `PROV:UGUISU_01:4A2B9C8F...:00000000:a3f2\n`

- **CHECKSUM_HEX** is a 4-hex-character CRC-16-CCITT to detect transmission errors.
- **Device Responses**: `ACK:PROV_SUCCESS\n`, `ERR:MALFORMED\n`, or `ERR:CHECKSUM\n`.

### Ephemeral Memory
The key only exists in the browser's RAM during the pairing session. Once the tab is closed, the key is gone forever. If a device breaks, a *new* key must be generated and flashed to both the surviving device and the replacement device.

## Safety & Legal

- This is a prototype security/power-interrupt device. Use at your own risk.
- Not affiliated with Segway-Ninebot.
- **Do not test “lock” behavior while riding.**
