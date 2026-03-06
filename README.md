# Whimbrel — Ninebot G30 BLE Immobilizer Companion Web App

Whimbrel is the **companion web app** of a three-part immobilizer system ([Uguisu](https://github.com/LPFchan/Uguisu) fob + [Guillemot](https://github.com/LPFchan/Guillemot) receiver + Whimbrel) for the Ninebot Max G30. It serves two primary functions: flashing firmware updates directly from the browser, and handling the cryptographic generation and secure USB injection of a pre-shared AES-128-CCM key to pair the devices.

This repository contains the **Whimbrel static web app**. Note that shared protocol and cryptography logic is implemented in the [ImmoCommon](https://github.com/LPFchan/ImmoCommon) repository.

## Tech Stack

- **Frontend**: Vanilla HTML / CSS / JavaScript
- **Cryptography**: Web Crypto API for CSPRNG 128-bit key generation
- **Transport**: Web Serial API via USB CDC
- **Hosting**: GitHub Pages

## Provisioning Protocol

Whimbrel uses the Web Serial API because it requires physical USB-C access, eliminating the risk of over-the-air pairing interception. The nRF52840's VBUS detection wakes the MCU from strict sleep to handle the serial configuration.

### Serial Payload

Whimbrel sends a delimited string to the MCU at 115200 baud:
`PROV:<128_BIT_HEX_KEY>:<8_HEX_COUNTER>:<CHECKSUM_HEX>\n`

Example: `PROV:4a2b9c8f...32chars...:00000000:a3f2\n`

- **CHECKSUM_HEX** is a 4-hex-character CRC-16-CCITT to detect transmission errors.
- **Device Responses**: `ACK:PROV_SUCCESS\n`, `ERR:MALFORMED\n`, or `ERR:CHECKSUM\n`.

### Ephemeral Memory

The key only exists in the browser's RAM during the pairing session. Once the tab is closed, the key is gone forever. If a device breaks, a *new* key must be generated and flashed to both the surviving device and the replacement device.

## Usage

Whimbrel is completely serverless and offline-capable. Once loaded in Chrome or Edge, it runs entirely in the browser.

### Firmware Flashing

Whimbrel can fetch the latest firmware releases from GitHub and flash them via the Nordic Serial DFU protocol over Web Serial.

1. Switch to the **Firmware** tab.
2. Select either the **Guillemot Receiver** or **Uguisu Fob**. The app will automatically fetch the latest release version.
3. Double-tap the reset button on your device to enter Bootloader mode.
4. Click **Flash Firmware**, select the bootloader serial port, and wait for the flashing to complete.

### Key Provisioning

1. **Generate Secret**: Click "Generate New Secret" to create a random 16-byte hex string in RAM.
2. **Flash Uguisu**: Plug the Uguisu fob into the PC via USB-C and click "Flash Key Fob". The browser prompts for the serial port.
3. **Flash Guillemot**: Plug the Guillemot receiver into the PC via USB-C and click "Flash Receiver". Select its serial port.
4. **Completion**: Both devices are synchronized with the same AES key and counter. The system is securely paired.

## Safety & Legal

- This is a prototype security/power-interrupt device. Use at your own risk.
- Not affiliated with Segway-Ninebot.
- **Do not test “lock” behavior while riding.**

