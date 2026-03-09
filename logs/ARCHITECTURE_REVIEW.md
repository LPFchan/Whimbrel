# Whimbrel — Architecture & Implementation Review

This document outlines areas for improvement within the Whimbrel codebase. It focuses exclusively on architectural bottlenecks, anti-patterns, and inefficiencies that warrant refactoring.

## 1. Concurrency & I/O Anti-Patterns

**Busy-Waiting / Polling Loops**
The asynchronous I/O heavily relies on manual polling loops rather than event-driven promises. This wastes CPU cycles, creates artificial latency, and makes the code harder to trace.
*   **`serial.js` (`readLineWithTimeout`)**: Polls `readBuffer` in an infinite loop with a `setTimeout` fallback.
*   **`dfu.js` (`receiveResponse`)**: Polls the `responseQueue` every 10ms waiting for the correct opcode.
*   **Recommendation**: Refactor to use deferred Promises (storing the `resolve`/`reject` callbacks to be fired when data arrives) or utilize `TransformStream` implementations for line-breaking and SLIP framing so consumers can simply `await reader.read()`.

## 2. State Management & Encapsulation

**Global Singleton State**
*   **`serial.js`**: Relies on module-level global variables (`portRef`, `reader`, `writer`, `readBuffer`, `readerLoopPromise`). This strict singleton pattern breaks encapsulation and introduces hidden side-effects across the app lifecycle.
*   **Recommendation**: Encapsulate the serial port state within an instantiable `SerialConnection` class.

## 3. Coupling & Separation of Concerns

**Monolithic UI Modules**
*   **`firmware.js`**: The `initFirmwareTab` function is heavily overloaded. It mixes direct DOM manipulation, application state (`fwCurrentStepIdx`), network requests (GitHub API), binary file extraction (`JSZip`), and DFU orchestration all into a single context.
*   **Recommendation**: Separate this into distinct layers:
    1.  **API Service**: For fetching GitHub releases.
    2.  **Firmware Manager**: For downloading and parsing the ZIP manifest/binaries.
    3.  **UI Controller**: Strictly for DOM updates and event listening.

**Hardcoded Business Logic**
*   **`firmware.js`**: The GitHub repository owner (`LPFchan`) is hardcoded directly into the `fetch()` URLs.
*   **Recommendation**: Move configuration constants to a dedicated configuration file or inject them into the modules.

## 4. Architectural Modernization

**Lack of ES Modules**
*   The application relies on sequential `<script>` tag loading in `index.html` and pollutes the global `window` object (e.g., `window.DfuFlasher`, global UI functions). 
*   **Recommendation**: Migrate to native ES Modules (`<script type="module">`). This enables explicit `import`/`export` syntax, prevents global namespace pollution, and makes the dependency graph trackable.

## 5. Memory Inefficiencies

**Buffer Allocations during DFU**
*   **`dfu.js` (`SlipFramer` & `writeObject`)**: SLIP encoding pushes bytes one by one into standard JavaScript Arrays before converting them back to `Uint8Array`. The chunking logic also relies heavily on `.slice()`, creating new buffer copies in memory for every chunk.
*   **Recommendation**: Pre-allocate a `Uint8Array` of the maximum MTU size and use `subarray()` or write directly into the buffer to avoid constant garbage collection overhead during firmware flashing.
