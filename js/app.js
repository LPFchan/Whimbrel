/**
 * Whimbrel app: UI state, key generation, and Flash Key Fob / Flash Receiver flows.
 * Bundled version (no modules) to support double-click (file://) execution.
 */

const DEMO_MODE = typeof window !== "undefined" && window.WHIMBREL_DEMO === true;

// ==========================================
// CRYPTO.JS
// ==========================================
const KEY_LEN_BYTES = 16;
function generateKey() {
  const bytes = new Uint8Array(KEY_LEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ==========================================
// SERIAL.JS
// ==========================================
const BAUDRATE = 115200;
let portRef = null;
let reader = null;
let writer = null;
let readBuffer = "";
let readerLoopPromise = null;

function isSupported() {
  if (DEMO_MODE) return true;
  return "serial" in navigator;
}

async function requestPort() {
  return await navigator.serial.requestPort();
}

async function openPort(port) {
  portRef = port;
  await port.open({ baudRate: BAUDRATE });
  
  const encoder = new TextEncoderStream();
  encoder.readable.pipeTo(port.writable);
  writer = encoder.writable.getWriter();
  
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);
  reader = decoder.readable.getReader();
  readBuffer = "";

  readerLoopPromise = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) readBuffer += value;
      }
    } catch (e) {
      // Stream closed or error
    }
  })();
}

async function sendLine(line) {
  if (!writer) throw new Error("Serial not open");
  await writer.write(line + "\n");
}

async function readLineWithTimeout(timeoutMs) {
  if (!reader) throw new Error("Serial not open");
  
  const startTime = Date.now();
  
  while (true) {
    const idx = readBuffer.indexOf("\n");
    if (idx !== -1) {
      const line = readBuffer.slice(0, idx).trim();
      readBuffer = readBuffer.slice(idx + 1);
      return line;
    }
    
    const remainingMs = timeoutMs - (Date.now() - startTime);
    if (remainingMs <= 0) {
      throw new Error(`Timeout (${(timeoutMs / 1000).toFixed(0)}s)`);
    }

    await new Promise(r => setTimeout(r, Math.min(50, remainingMs)));
  }
}

async function closePort(port) {
  try {
    if (reader) {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
      reader = null;
    }
    if (writer) {
      await writer.close().catch(() => {});
      writer.releaseLock();
      writer = null;
    }
    if (readerLoopPromise) {
      await readerLoopPromise;
      readerLoopPromise = null;
    }
  } finally {
    if (port) {
      await port.close().catch(() => {});
    }
    portRef = null;
  }
}


// ==========================================
// APP.JS
// ==========================================
const DEVICE_ID_FOB = "UGUISU_01";
const DEVICE_ID_RX = "GUILLEMOT_01";
const BOOTED_FOB = "BOOTED:Uguisu";
const BOOTED_RX = "BOOTED:Guillemot";
const RESET_COUNTER = "00000000";
const TIMEOUT_PROV_MS = 12000;
const TIMEOUT_BOOT_MS = 10000;

/** @type {string | null} */
let currentKey = null;
let fobFlashed = false;
let receiverFlashed = false;

document.addEventListener("DOMContentLoaded", () => {
  // #region agent log
  fetch('http://127.0.0.1:7748/ingest/7c248faa-9499-4eab-94c9-76fab9a34041',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b4a7bc'},body:JSON.stringify({sessionId:'b4a7bc',runId:'run1',hypothesisId:'H4',location:'app.js:init',message:'Stepper width check',data:{stepperWidth:document.getElementById("stepper").offsetWidth,panelWidth:document.getElementById("main-panel").offsetWidth},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const el = {
    mainPanel: document.getElementById("main-panel"),
    unsupportedMsg: document.getElementById("unsupported-msg"),
    navHeader: document.getElementById("nav-header"),
    btnBack: document.getElementById("btn-back"),
    homeLink: document.getElementById("home-link"),
    btnGenerate: document.getElementById("btn-generate"),
    btnFlashFob: document.getElementById("btn-flash-fob"),
    btnFlashReceiver: document.getElementById("btn-flash-receiver"),
    keyStatus: document.getElementById("key-status"),
    keyPreviewContainer: document.getElementById("key-preview-container"),
    keyPreview: document.getElementById("key-preview"),
    keyPreviewDots: document.getElementById("key-preview-dots"),
    fobStatus: document.getElementById("fob-status"),
    receiverStatus: document.getElementById("receiver-status"),
    notes: document.getElementById("notes"),
    secGen: document.getElementById("generate"),
    secFob: document.getElementById("flash-fob"),
    secRx: document.getElementById("flash-receiver"),
    timeoutIndicator: document.getElementById("timeout-indicator"),
    progressCircle: document.querySelector("#timeout-indicator .progress-ring-circle"),
    stepper: document.getElementById("stepper"),
    step1Title: document.getElementById("step-1-title"),
    stepCircles: [
      document.getElementById("step-circle-1"),
      document.getElementById("step-circle-2"),
      document.getElementById("step-circle-3")
    ]
  };

  let currentStepIdx = 0; // 0: Gen, 1: Fob, 2: Rx
  let heightAnimTimeout = null;

  function animateHeightChange(callback) {
    if (heightAnimTimeout) {
      clearTimeout(heightAnimTimeout);
      el.mainPanel.style.height = 'auto';
      el.mainPanel.style.transitionProperty = 'background-color, border-color, box-shadow';
    }

    const startHeight = el.mainPanel.offsetHeight;
    el.mainPanel.style.height = startHeight + 'px';
    el.mainPanel.style.overflow = 'hidden';
    
    callback();
    
    el.mainPanel.style.height = 'auto';
    const targetHeight = el.mainPanel.offsetHeight;
    
    if (startHeight === targetHeight) {
      el.mainPanel.style.overflow = 'visible';
      return;
    }

    el.mainPanel.style.height = startHeight + 'px';
    el.mainPanel.offsetHeight; // force reflow
    
    el.mainPanel.style.transitionProperty = 'height, background-color, border-color, box-shadow';
    el.mainPanel.style.transitionDuration = '0.4s, 0.3s, 0.3s, 0.3s';
    
    el.mainPanel.style.height = targetHeight + 'px';
    
    heightAnimTimeout = setTimeout(() => {
      el.mainPanel.style.height = 'auto';
      el.mainPanel.style.overflow = 'visible';
      el.mainPanel.style.transitionProperty = 'background-color, border-color, box-shadow';
      heightAnimTimeout = null;
    }, 400);
  }

  async function showStep(stepIndex, pushStateFlag = true) {
    if (currentStepIdx === stepIndex) return;
    
    if (pushStateFlag && stepIndex > currentStepIdx) {
      pushHistory(stepIndex);
    }

    const visibleEls = [el.secGen, el.secFob, el.secRx, el.navHeader, el.notes].filter(e => e.classList.contains('step-visible'));
    visibleEls.forEach(e => e.classList.add('step-fading-out'));
    
    await new Promise(r => setTimeout(r, 200));

    animateHeightChange(() => {
      currentStepIdx = stepIndex;
      
      el.stepCircles.forEach((c, idx) => {
        if (idx === Math.min(stepIndex, 2)) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });
      
      // Hide all
      [el.secGen, el.secFob, el.secRx, el.navHeader, el.notes].forEach(e => {
        e.classList.remove("step-visible", "step-fading-out");
        e.classList.add("step-hidden");
      });

      if (stepIndex === 0) {
        el.stepper.classList.remove("step-fading-out", "step-hidden");
        el.stepper.classList.add("step-visible");
        el.secGen.classList.remove("step-hidden");
        el.secGen.classList.add("step-visible");
        el.btnGenerate.style.display = 'block';
        el.step1Title.textContent = "Generate New Key";
        el.keyPreviewContainer.style.display = 'none';
        el.keyPreviewDots.style.opacity = '0';
        el.keyPreviewDots.style.filter = 'blur(4px)';
      } else if (stepIndex === 1) {
        el.stepper.classList.remove("step-fading-out", "step-hidden");
        el.stepper.classList.add("step-visible");
        el.navHeader.classList.remove("step-hidden");
        el.navHeader.classList.add("step-visible");
        el.secFob.classList.remove("step-hidden");
        el.secFob.classList.add("step-visible");
      } else if (stepIndex === 2) {
        el.stepper.classList.remove("step-fading-out", "step-hidden");
        el.stepper.classList.add("step-visible");
        el.navHeader.classList.remove("step-hidden");
        el.navHeader.classList.add("step-visible");
        el.secRx.classList.remove("step-hidden");
        el.secRx.classList.add("step-visible");
      } else if (stepIndex === 3) {
        el.stepper.classList.remove("step-visible", "step-fading-out");
        el.stepper.classList.add("step-hidden");
        el.notes.classList.remove("step-hidden");
        el.notes.classList.add("step-visible");
      }
    });
  }

  el.btnBack.addEventListener("click", () => {
    if (currentStepIdx > 0) {
      history.back();
    }
  });

  el.homeLink.addEventListener("click", () => {
    if (currentStepIdx > 0) {
      pushHistory(0);
      showStep(0);
    }
  });

  function pushHistory(stepIndex) {
    try {
      history.pushState({ tab: 'keys', step: stepIndex }, "", `#step${stepIndex + 1}`);
    } catch (e) {
      // file:// protocol restricts pushState in some browsers
    }
  }

  function replaceHistory(stepIndex) {
    try {
      history.replaceState({ tab: 'keys', step: stepIndex }, "", `#step${stepIndex + 1}`);
    } catch (e) {
      // file:// protocol restricts replaceState in some browsers
    }
  }

  function switchTabUI(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(b => {
      b.classList.remove('active');
      if (b.dataset.tab === tabId) b.classList.add('active');
    });
    tabContents.forEach(c => {
      c.style.display = 'none';
      c.classList.remove('active');
      if (c.id === tabId) {
        c.style.display = 'block';
        c.classList.add('active');
      }
    });
  }

  window.addEventListener("popstate", (e) => {
    if (e.state !== null) {
      if (e.state.tab === 'keys') {
        switchTabUI('tab-keys');
        if (typeof e.state.step === 'number') {
          showStep(e.state.step, false);
        }
      } else if (e.state.tab === 'firmware') {
        switchTabUI('tab-firmware');
        if (typeof e.state.fwStep === 'number') {
          showFwStep(e.state.fwStep, false);
        }
      }
    }
  });

  // Set initial history state
  history.replaceState({ tab: 'firmware', fwStep: 0 }, "", "#firmware-step1");

  async function runTimeout(containerEl, circleEl, ms) {
    containerEl.classList.add("visible");
    circleEl.style.transition = 'none';
    circleEl.style.strokeDashoffset = '50.26';
    // #region agent log
    fetch('http://127.0.0.1:7748/ingest/7c248faa-9499-4eab-94c9-76fab9a34041',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b4a7bc'},body:JSON.stringify({sessionId:'b4a7bc',runId:'run2',hypothesisId:'H1_fix',location:'app.js:runTimeout',message:'Timeout ring offset fixed',data:{offset:circleEl.style.strokeDashoffset},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // trigger reflow
    circleEl.getBoundingClientRect();
    
    circleEl.style.transition = `stroke-dashoffset ${ms}ms linear`;
    circleEl.style.strokeDashoffset = '0';
    
    await new Promise(r => setTimeout(r, ms));
    containerEl.classList.remove("visible");
    await new Promise(r => setTimeout(r, 300));
  }

  if (!isSupported()) {
    el.mainPanel.style.display = "none";
    const mainTabs = document.getElementById("main-tabs");
    if (mainTabs) mainTabs.style.display = "none";
    el.unsupportedMsg.style.display = "block";
    return;
  }

  function triggerConfetti() {
    if (typeof window.confetti === "function") {
      const duration = 3000;
      const end = Date.now() + duration;

      (function frame() {
        window.confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3b82f6', '#10b981', '#ffffff']
        });
        window.confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3b82f6', '#10b981', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }

  function setKey(key) {
    currentKey = key;
    el.btnFlashFob.disabled = !key;
    el.btnFlashReceiver.disabled = !key;
  }

  async function animateKeyGeneration(finalKey) {
    // #region agent log
    fetch('http://127.0.0.1:7748/ingest/7c248faa-9499-4eab-94c9-76fab9a34041',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b4a7bc'},body:JSON.stringify({sessionId:'b4a7bc',runId:'run1',hypothesisId:'H5',location:'app.js:animateKeyGeneration',message:'Key generation styling',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    el.btnGenerate.disabled = true;
    animateHeightChange(() => {
      el.btnGenerate.style.display = 'none';
      el.step1Title.textContent = "Creating a new AES-128 key ...";
      el.keyPreviewContainer.style.display = 'block';
      el.keyPreviewDots.style.display = 'block';
    });
    
    el.keyPreview.classList.add("scrambling");
    el.keyPreview.classList.remove("revealed");
    el.keyPreview.style.opacity = "1";
    el.keyPreview.style.filter = "blur(0px)";
    
    const hexChars = "0123456789abcdef";
    for (let len = 1; len <= 32; len++) {
      let scrambled = "";
      for (let j = 0; j < len; j++) {
        scrambled += hexChars[Math.floor(Math.random() * hexChars.length)];
      }
      el.keyPreview.textContent = scrambled;
      await new Promise(r => setTimeout(r, 30));
    }
    
    // Freeze state for 1 second
    el.keyPreview.classList.remove("scrambling");
    await new Promise(r => setTimeout(r, 1000));
    
    // Blur and fade out scrambled string, while fading in dots
    el.keyPreview.style.opacity = "0";
    el.keyPreview.style.filter = "blur(4px)";
    
    setKey(finalKey);
    el.keyPreviewDots.style.opacity = "1";
    el.keyPreviewDots.style.filter = "blur(0px)";
    
    await new Promise(r => setTimeout(r, 400));
    
    el.btnGenerate.disabled = false;
    
    // Waiting circle takes 1.5 seconds
    await runTimeout(el.timeoutIndicator, el.progressCircle, 1500);
    showStep(1);
  }

  function clearKeyStatus() {
    animateHeightChange(() => {
      el.keyStatus.textContent = "";
      el.keyStatus.className = "status";
    });
  }

  function setFobStatus(text, isError = false) {
    animateHeightChange(() => {
      el.fobStatus.textContent = text;
      el.fobStatus.className = "status " + (isError ? "error" : "success");
      
      const fobDesc = document.getElementById("fob-desc");
      const flashBtn = el.btnFlashFob;
      
      if (text === "") {
        fobDesc.style.display = "block";
        el.fobStatus.style.display = "none";
      } else {
        fobDesc.style.display = "none";
        // #region agent log
        fetch('http://127.0.0.1:7748/ingest/7c248faa-9499-4eab-94c9-76fab9a34041',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b4a7bc'},body:JSON.stringify({sessionId:'b4a7bc',runId:'run2',hypothesisId:'H2_fix',location:'app.js:setFobStatus',message:'Kept flash btn',data:{text:text},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        el.fobStatus.style.display = "block";
      }
    });
  }

  function setReceiverStatus(text, isError = false) {
    animateHeightChange(() => {
      el.receiverStatus.textContent = text;
      el.receiverStatus.className = "status " + (isError ? "error" : "success");

      const rxDesc = document.getElementById("receiver-desc");
      const flashBtn = el.btnFlashReceiver;
      
      if (text === "") {
        rxDesc.style.display = "block";
        el.receiverStatus.style.display = "none";
      } else {
        rxDesc.style.display = "none";
        el.receiverStatus.style.display = "block";
      }
    });
  }

  function crc16Key(keyHex) {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++)
      bytes[i] = parseInt(keyHex.slice(i * 2, i * 2 + 2), 16);
    let crc = 0xffff;
    for (let i = 0; i < 16; i++) {
      crc ^= bytes[i] << 8;
      for (let k = 0; k < 8; k++)
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : (crc << 1);
    }
    return (crc & 0xffff).toString(16).padStart(4, "0").toLowerCase();
  }

  function buildProvLine(deviceId) {
    if (!currentKey || currentKey.length !== 32) throw new Error("Invalid key");
    const checksum = crc16Key(currentKey);
    return `PROV:${deviceId}:${currentKey}:${RESET_COUNTER}:${checksum}`;
  }

  async function waitForBooted(expectedBooted) {
    const deadline = Date.now() + TIMEOUT_BOOT_MS;
    while (Date.now() < deadline) {
      const remaining = Math.max(1000, deadline - Date.now());
      const line = await readLineWithTimeout(remaining);
      if (line === expectedBooted) return;
      if (line.startsWith("ERR:"))
        throw new Error(`Step 2 (boot): ${line}`);
    }
    throw new Error(
      `Step 2 (boot): device did not confirm boot within ${TIMEOUT_BOOT_MS / 1000}s`
    );
  }

  async function provisionDevice(deviceId, setStatus, expectedBooted) {
    if (!currentKey) {
      setStatus("Generate a secret first.", true);
      return;
    }
    if (!isSupported()) {
      setStatus("Web Serial not supported.", true);
      return;
    }
    if (DEMO_MODE) {
      try {
        setStatus("Writing key…");
        await new Promise((r) => setTimeout(r, 600));
        setStatus("Waiting for device to boot…");
        await new Promise((r) => setTimeout(r, 900));
        setStatus("Done. Device provisioned and running.");
        if (deviceId === DEVICE_ID_FOB) {
          fobFlashed = true;
          await runTimeout(el.timeoutIndicator, el.progressCircle, 1500);
          showStep(2);
        }
        if (deviceId === DEVICE_ID_RX) receiverFlashed = true;
        if (fobFlashed && receiverFlashed && currentStepIdx === 2) {
          await showStep(3);
          triggerConfetti();
        }
      } catch (e) {
        setStatus(e.message || "Demo error", true);
      }
      return;
    }
    let port = null;
    try {
      port = await requestPort();
      await openPort(port);

      setStatus("Writing key…");
      const line = buildProvLine(deviceId);
      await sendLine(line);
      const response = await readLineWithTimeout(TIMEOUT_PROV_MS);
      if (response !== "ACK:PROV_SUCCESS") {
        if (response.startsWith("ERR:")) {
          setStatus(`Step 1 (write & verify) failed: ${response}`, true);
        } else {
          setStatus(`Step 1 (write & verify) failed: unexpected response: ${response}`, true);
        }
        return;
      }

      setStatus("Waiting for device to boot…");
      await waitForBooted(expectedBooted);

      setStatus("Done. Device provisioned and running.");
      if (deviceId === DEVICE_ID_FOB) {
        fobFlashed = true;
        await runTimeout(el.timeoutIndicator, el.progressCircle, 1500);
        showStep(2);
      }
      if (deviceId === DEVICE_ID_RX) receiverFlashed = true;
      
      if (fobFlashed && receiverFlashed && currentStepIdx === 2) {
        await showStep(3);
        triggerConfetti();
      }
    } catch (e) {
      const msg = e.message || "Serial error";
      if (msg.includes("Timeout"))
        setStatus(`Step failed (timeout): ${msg}`, true);
      else
        setStatus(msg, true);
    } finally {
      if (port) await closePort(port);
    }
  }

  el.btnGenerate.addEventListener("click", async () => {
    clearKeyStatus();
    
    let key;
    try {
      key = generateKey();
    } catch (e) {
      console.error("Key generation error:", e);
      animateHeightChange(() => {
        el.keyStatus.textContent = "Error generating key.";
        el.keyStatus.className = "status error";
        el.btnGenerate.style.display = 'block';
        el.step1Title.textContent = "Generate New Key";
        el.keyPreviewContainer.style.display = 'none';
      });
      return;
    }

    animateHeightChange(() => {
      fobFlashed = false;
      receiverFlashed = false;
      
      el.notes.classList.remove("step-visible");
      el.notes.classList.add("step-hidden");
      
      el.fobStatus.textContent = "";
      el.fobStatus.className = "status";
      el.fobStatus.style.display = "none";
      document.getElementById("fob-desc").style.display = "block";
      
      el.receiverStatus.textContent = "";
      el.receiverStatus.className = "status";
      el.receiverStatus.style.display = "none";
      document.getElementById("receiver-desc").style.display = "block";
    });
    
    await animateKeyGeneration(key);
  });

  el.btnFlashFob.addEventListener("click", async () => {
    setFobStatus("Select port…");
    await provisionDevice(DEVICE_ID_FOB, setFobStatus, BOOTED_FOB);
  });

  el.btnFlashReceiver.addEventListener("click", async () => {
    setReceiverStatus("Select port…");
    await provisionDevice(DEVICE_ID_RX, setReceiverStatus, BOOTED_RX);
  });

  // ==========================================
  // TAB SWITCHING & FIRMWARE FLASHER
  // ==========================================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  let fwCurrentStepIdx = 0; // 0: Select Device, 1: Instructions, 2: Flash Firmware
  const fwStep1 = document.getElementById("fw-step-1");
  const fwStepInstructions = document.getElementById("fw-step-instructions");
  const fwStep2 = document.getElementById("fw-step-2");
  const fwDeviceTitle = document.getElementById("fw-device-title");

  function showFwStep(stepIndex, pushStateFlag = true) {
    if (fwCurrentStepIdx === stepIndex) return;
    
    if (pushStateFlag && stepIndex > fwCurrentStepIdx) {
      try { history.pushState({ tab: 'firmware', fwStep: stepIndex }, "", `#firmware-step${stepIndex + 1}`); } catch (e) {}
    }

    const visibleEls = [fwStep1, fwStepInstructions, fwStep2].filter(e => e && e.classList.contains('step-visible'));
    visibleEls.forEach(e => e.classList.add('step-fading-out'));
    
    setTimeout(() => {
      animateHeightChange(() => {
        fwCurrentStepIdx = stepIndex;
        
        [fwStep1, fwStepInstructions, fwStep2].forEach(e => {
          if (e) {
            e.classList.remove("step-visible", "step-fading-out");
            e.classList.add("step-hidden");
          }
        });

        if (stepIndex === 0 && fwStep1) {
          fwStep1.classList.remove("step-hidden");
          fwStep1.classList.add("step-visible");
        } else if (stepIndex === 1 && fwStepInstructions) {
          fwStepInstructions.classList.remove("step-hidden");
          fwStepInstructions.classList.add("step-visible");
        } else if (stepIndex === 2 && fwStep2) {
          fwStep2.classList.remove("step-hidden");
          fwStep2.classList.add("step-visible");
        }
      });
    }, 200);
  }

  const btnFwInstructionsBack = document.getElementById("btn-fw-instructions-back");
  if (btnFwInstructionsBack) {
    btnFwInstructionsBack.addEventListener("click", () => {
      if (fwCurrentStepIdx > 0) {
        history.back();
      }
    });
  }

  const btnFwBack = document.getElementById("btn-fw-back");
  if (btnFwBack) {
    btnFwBack.addEventListener("click", () => {
      if (fwCurrentStepIdx > 0) {
        history.back();
      }
    });
  }

  const btnFwContinue = document.getElementById("btn-fw-continue");
  if (btnFwContinue) {
    btnFwContinue.addEventListener("click", () => {
      showFwStep(2);
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => {
        c.style.display = 'none';
        c.classList.remove('active');
      });
      
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      target.style.display = 'block';
      target.classList.add('active');
      
      // Update history
      if (btn.dataset.tab === 'tab-keys') {
        try { history.replaceState({ tab: 'keys', step: currentStepIdx }, "", `#step${currentStepIdx + 1}`); } catch (e) {}
      } else {
        try { history.replaceState({ tab: 'firmware', fwStep: fwCurrentStepIdx }, "", `#firmware-step${fwCurrentStepIdx + 1}`); } catch (e) {}
      }
    });
  });

  const btnFwGuillemot = document.getElementById("btn-fw-guillemot");
  const btnFwUguisu = document.getElementById("btn-fw-uguisu");
  const fwReleaseInfo = document.getElementById("fw-release-info");
  const fwReleaseDropdown = document.getElementById("fw-release-dropdown");
  const btnFlashFw = document.getElementById("btn-flash-fw");
  const fwStatus = document.getElementById("fw-status");
  const fwProgressContainer = document.getElementById("fw-progress-container");
  const fwProgressBar = document.getElementById("fw-progress-bar");

  let latestFwZipUrl = null;
  let latestFwZipBuffer = null;
  let allReleases = [];

  async function fetchReleases(repoName) {
    try {
      fwReleaseInfo.innerHTML = `<span>Fetching releases for ${repoName}...</span>`;
      fwReleaseDropdown.innerHTML = "";
      btnFlashFw.disabled = true;
      latestFwZipUrl = null;
      latestFwZipBuffer = null;
      allReleases = [];

      if (DEMO_MODE) {
        allReleases = [{ tag_name: "v0.1.0", html_url: "#", assets: [{ name: `${repoName}-v0.1.0.zip`, browser_download_url: "#" }] }];
        selectRelease(allReleases[0], true);
        fwReleaseDropdown.innerHTML = `<div class="release-item selected" data-idx="0"><strong>v0.1.0</strong><span class="badge-latest">latest</span><br><small style="color: var(--muted);">${repoName}-v0.1.0.zip</small></div>`;
        fwReleaseInfo.innerHTML = `<div><span>v0.1.0</span><span class="badge-latest">latest</span><br><small style="color: var(--muted);">${repoName}-v0.1.0.zip</small></div><span style="font-size: 0.8em; margin-left: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;"><polyline points="6 9 12 15 18 9"></polyline></svg></span>`;
        btnFlashFw.disabled = false;
        return;
      }

      const res = await fetch(`https://api.github.com/repos/LPFchan/${repoName}/releases`);
      if (!res.ok) throw new Error("Failed to fetch releases");
      
      const data = await res.json();
      allReleases = data.filter(r => r.assets && r.assets.some(a => a.name.endsWith('.zip')));
      
      if (allReleases.length === 0) throw new Error("No .zip firmware package found in releases");
      
      // Select the most recent release by default
      selectRelease(allReleases[0], true);
      
      // Populate dropdown
      fwReleaseDropdown.innerHTML = allReleases.map((r, idx) => {
        const zipAsset = r.assets.find(a => a.name.endsWith('.zip'));
        return `<div class="release-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}">
          <strong>${r.tag_name}</strong>${idx === 0 ? '<span class="badge-latest">latest</span>' : ''}<br>
          <small style="color: var(--muted);">${zipAsset.name}</small>
        </div>`;
      }).join('');
      
      // Add event listeners to dropdown items
      const items = fwReleaseDropdown.querySelectorAll('.release-item');
      items.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          items.forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          selectRelease(allReleases[item.dataset.idx], parseInt(item.dataset.idx) === 0);
          fwReleaseDropdown.classList.remove('visible');
        });
      });
    } catch (e) {
      fwReleaseInfo.innerHTML = `<span style="color: var(--error)">Error: ${e.message}</span>`;
      btnFlashFw.disabled = true;
    }
  }

  function selectRelease(releaseData, isLatest = false) {
    const zipAsset = releaseData.assets.find(a => a.name.endsWith('.zip'));
    if (zipAsset) {
      latestFwZipUrl = zipAsset.browser_download_url;
      latestFwZipBuffer = null; // Clear cached buffer
      fwReleaseInfo.innerHTML = `<div><a href="${releaseData.html_url}" target="_blank" onclick="event.stopPropagation()">${releaseData.tag_name}</a>${isLatest ? '<span class="badge-latest">latest</span>' : ''}<br><small style="color: var(--muted);">${zipAsset.name}</small></div><span style="font-size: 0.8em; margin-left: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;"><polyline points="6 9 12 15 18 9"></polyline></svg></span>`;
      btnFlashFw.disabled = false;
    }
  }

  // Toggle dropdown on info click
  fwReleaseInfo.addEventListener('click', () => {
    if (allReleases.length > 0) {
      fwReleaseDropdown.classList.toggle('visible');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!fwReleaseInfo.contains(e.target) && !fwReleaseDropdown.contains(e.target)) {
      fwReleaseDropdown.classList.remove('visible');
    }
  });

  if (btnFwGuillemot) {
    btnFwGuillemot.addEventListener('click', () => {
      showFwStep(1); // Go to instructions
      fetchReleases("Guillemot"); // Background fetch releases
    });
  }

  if (btnFwUguisu) {
    btnFwUguisu.addEventListener('click', () => {
      showFwStep(1); // Go to instructions
      fetchReleases("Uguisu"); // Background fetch releases
    });
  }

  function setFwStatus(text, progress = null, isError = false) {
    fwStatus.style.display = "block";
    fwStatus.textContent = text;
    fwStatus.className = "status " + (isError ? "error" : "success");
    
    if (progress !== null) {
      fwProgressContainer.style.display = "block";
      fwProgressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    } else {
      fwProgressContainer.style.display = "none";
    }
  }

  btnFlashFw.addEventListener('click', async () => {
    if (!isSupported()) {
      setFwStatus("Web Serial not supported in this browser.", null, true);
      return;
    }
    if (DEMO_MODE) {
      try {
        setFwStatus("Downloading firmware package...", 0);
        await new Promise((r) => setTimeout(r, 400));
        setFwStatus("Parsing zip file...", 0.1);
        await new Promise((r) => setTimeout(r, 300));
        setFwStatus("Starting DFU process...", 0.2);
        for (let i = 1; i <= 10; i++) {
          setFwStatus("Writing firmware...", 0.2 + (i / 10) * 0.8);
          await new Promise((r) => setTimeout(r, 200));
        }
        setFwStatus("Firmware flashed successfully! Device will reboot.", 1.0);
        triggerConfetti();
      } catch (e) {
        setFwStatus(`Error: ${e.message}`, null, true);
      }
      return;
    }
    if (!latestFwZipUrl) {
      setFwStatus("No firmware URL available to download.", null, true);
      return;
    }

    let port = null;
    try {
      port = await requestPort();
      
      setFwStatus("Downloading firmware package...", 0);
      
      if (!latestFwZipBuffer) {
        const res = await fetch(latestFwZipUrl);
        if (!res.ok) throw new Error("Failed to download firmware zip");
        latestFwZipBuffer = await res.arrayBuffer();
      }

      setFwStatus("Parsing zip file...", 0.1);
      const zip = await JSZip.loadAsync(latestFwZipBuffer);
      
      const manifestFile = zip.file("manifest.json");
      if (!manifestFile) throw new Error("manifest.json not found in the zip");
      
      const manifestStr = await manifestFile.async("string");
      const manifest = JSON.parse(manifestStr);
      
      const appManifest = manifest.manifest.application;
      if (!appManifest) throw new Error("Application manifest not found");

      const datFile = zip.file(appManifest.dat_file);
      const binFile = zip.file(appManifest.bin_file);

      if (!datFile || !binFile) throw new Error("Missing .dat or .bin files specified in manifest");

      const datBytes = await datFile.async("uint8array");
      const binBytes = await binFile.async("uint8array");

      setFwStatus("Starting DFU process...", 0.2);
      
      if (!window.DfuFlasher) throw new Error("DfuFlasher module not loaded");
      
      const flasher = new window.DfuFlasher(port, datBytes, binBytes);
      await flasher.flash((msg, prog) => {
        setFwStatus(msg, 0.2 + ((prog || 0) * 0.8));
      });
      
      setFwStatus("Firmware flashed successfully! Device will reboot.", 1.0);
      triggerConfetti();
      
    } catch (e) {
      setFwStatus(`Error: ${e.message}`, null, true);
      console.error(e);
      if (port) {
        try {
          if (port.readable && port.readable.locked) {
            await port.readable.cancel().catch(() => {});
          }
          await port.close().catch(() => {});
        } catch (err) {}
      }
    }
  });

});
