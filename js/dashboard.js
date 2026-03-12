/**
 * Whimbrel Dashboard (BLE) logic
 *
 * The overlay owns the full flow end-to-end.
 * Crypto / BLE provisioning is delegated to the shared helpers in prov.js
 * (window.Whimbrel.provisionPhone, window.Whimbrel.animateHexReveal) so no
 * logic is duplicated between this and the main key-provision sequence.
 */

(function() {
  const initDashboard = () => {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    // ── SVG icons ──────────────────────────────────────────────────────
    const I = {
      back:    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
      close:   `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      pencil:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
      x:       `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      check:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      lock:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    };

    // ── HTML helpers ───────────────────────────────────────────────────
    const hdr = (title, {back: bId, close: cId} = {}) => `
      <div style="position:relative;min-height:40px;margin-bottom:24px;display:flex;align-items:center;justify-content:center;">
        ${bId ? `<div class="nav-header" style="position:absolute;left:0;top:50%;transform:translateY(-50%);margin:0;"><button id="${bId}" class="btn-back" type="button">${I.back} Back</button></div>` : ''}
        ${cId ? `<div class="nav-header" style="position:absolute;right:0;top:50%;transform:translateY(-50%);margin:0;"><button id="${cId}" class="btn-back" type="button">${I.close} Close</button></div>` : ''}
        <h2 style="margin:0;font-size:1.75rem;">${title}</h2>
      </div>`;

    const pinRow = id => `
      <div class="pin-circles" id="${id}" style="display:flex;gap:10px;justify-content:center;margin:25px 0;">
        <div class="pin-circle"></div><div class="pin-circle"></div><div class="pin-circle"></div>
        <div class="pin-circle"></div><div class="pin-circle"></div><div class="pin-circle"></div>
      </div>`;

    // ── Sections ───────────────────────────────────────────────────────
    container.innerHTML = `
      <!-- 1. Entry: Connect -->
      <section id="ds-connect" class="step step-visible">
        ${hdr('Manage Keys', {close: 'ds-close-1'})}
        <button id="ds-btn-connect" type="button" class="btn-huge" style="margin-top:20px;">Connect</button>
        <button id="ds-btn-nofob" type="button" style="background:none;border:none;color:var(--muted);font-family:inherit;font-size:1rem;font-weight:500;cursor:pointer;text-decoration:underline;margin-top:16px;display:block;width:100%;text-align:center;">I don't have a phone key</button>
        <div id="ds-st-connect" class="status" aria-live="polite"></div>
      </section>

      <!-- 2. Tutorial (no-fob flow) -->
      <section id="ds-tutorial" class="step step-hidden">
        ${hdr('Add a Phone Key', {back: 'ds-btn-tut-back'})}
        <div class="instructions-list" style="margin:30px 0;">
          <div class="instruction-item"><div class="instruction-number">1</div><p>Get near your vehicle.</p></div>
          <div class="instruction-item"><div class="instruction-number">2</div><p>Triple-press the button on your Uguisu fob to open the 30-second provisioning window.</p></div>
          <div class="instruction-item"><div class="instruction-number">3</div><p>Click Connect below.</p></div>
        </div>
        <button id="ds-btn-tut-connect" type="button" class="btn-huge">Connect</button>
        <div id="ds-st-tut" class="status" aria-live="polite"></div>
      </section>

      <!-- 3. Auth PIN (phone-key flow only) -->
      <section id="ds-auth-pin" class="step step-hidden">
        ${hdr('Enter PIN', {back: 'ds-btn-auth-back'})}
        <p style="font-size:0.9rem;color:var(--muted);">Enter your 6-digit PIN to authenticate.</p>
        ${pinRow('ds-auth-circles')}
        <div id="ds-st-auth" class="status" aria-live="polite"></div>
        <input type="tel" id="ds-in-auth" maxlength="6" style="position:absolute;opacity:0;pointer-events:none;">
      </section>

      <!-- 4. Device Slots -->
      <section id="ds-main" class="step step-hidden">
        ${hdr('Device Slots', {back: 'ds-btn-main-back'})}
        <div id="ds-slots" style="display:flex;flex-direction:column;width:100%;"></div>
      </section>

      <!-- 5. Generate New Key -->
      <section id="ds-generate" class="step step-hidden">
        ${hdr('Generate New Key', {back: 'ds-btn-gen-back'})}
        <p id="ds-gen-desc" style="font-size:0.9rem;color:var(--muted);margin-bottom:24px;"></p>
        <button id="ds-btn-generate" type="button" class="btn-huge">Generate</button>
      </section>

      <!-- 6. Creating Key animation — reuses the same key-preview CSS from the main flow -->
      <section id="ds-creating" class="step step-hidden">
        <h2 id="ds-step1-title" style="margin-bottom:24px;font-size:1.75rem;text-align:center;">Creating a new AES-128 key ...</h2>
        <div class="key-preview-container" id="ds-key-preview-container">
          <div id="ds-key-preview" class="key-preview" aria-live="polite"></div>
          <div id="ds-key-preview-dots" class="key-preview" aria-live="polite" style="opacity:0;filter:blur(4px);-webkit-text-security:disc;">00000000000000000000000000000000</div>
        </div>
      </section>

      <!-- 7. Provision PIN (slot 1 / no-fob flow) -->
      <section id="ds-prov-pin" class="step step-hidden">
        ${hdr('Create PIN', {back: 'ds-btn-prov-back'})}
        <p id="ds-prov-desc" style="font-size:0.9rem;color:var(--muted);margin-bottom:4px;"></p>
        ${pinRow('ds-prov-circles')}
        <div id="ds-st-prov" class="status" aria-live="polite"></div>
        <input type="tel" id="ds-in-prov" maxlength="6" style="position:absolute;opacity:0;pointer-events:none;">
      </section>

      <!-- 8. QR Code -->
      <section id="ds-qr" class="step step-hidden">
        ${hdr('Scan QR Code', {close: 'ds-close-qr'})}
        <p>Scan this code with the Pipit app.</p>
        <div style="text-align:center;margin:20px 0;">
          <img id="ds-qr-img" alt="QR Code" style="max-width:300px;width:100%;">
        </div>
        <button id="ds-btn-qr-done" type="button" class="btn-huge">Done</button>
      </section>
    `;

    // ── DOM refs ───────────────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const secConnect  = $('ds-connect');
    const secTutorial = $('ds-tutorial');
    const secAuthPin  = $('ds-auth-pin');
    const secMain     = $('ds-main');
    const secGenerate = $('ds-generate');
    const secCreating = $('ds-creating');
    const secProvPin  = $('ds-prov-pin');
    const secQR       = $('ds-qr');

    const slotsEl         = $('ds-slots');
    const qrImg           = $('ds-qr-img');
    const genDescEl       = $('ds-gen-desc');
    const keyPreviewEl    = $('ds-key-preview');
    const keyPreviewDots  = $('ds-key-preview-dots');
    const keyPreviewCont  = $('ds-key-preview-container');
    const provDescEl      = $('ds-prov-desc');

    const authCircles = document.querySelectorAll('#ds-auth-circles .pin-circle');
    const provCircles = document.querySelectorAll('#ds-prov-circles .pin-circle');
    const authInput   = $('ds-in-auth');
    const provInput   = $('ds-in-prov');
    const stAuth  = $('ds-st-auth');
    const stProv  = $('ds-st-prov');
    const stConn  = $('ds-st-connect');
    const stTut   = $('ds-st-tut');

    // ── State ──────────────────────────────────────────────────────────
    let bleManager               = null;
    let slots                    = [];
    let isNoFobFlow              = false;
    let targetSlotId             = 1;
    let generatedKeyHex          = '';   // key shown in animation; passed to provisionPhone
    let slotUIStates             = {};   // slotId → 'normal' | 'renaming' | 'confirming'
    let activePin                = null; // { circles, input, status, value, onComplete }
    let provisionOnDoneCallback  = null; // set when opened from the main provisioning flow

    // ── Modal height animation ─────────────────────────────────────────
    const modalEl = document.querySelector('.dashboard-modal');
    let hAnimTimeout = null;

    function animateH(cb) {
      if (!modalEl) { cb(); return; }
      if (hAnimTimeout) { clearTimeout(hAnimTimeout); modalEl.style.transition = "none"; modalEl.style.height = "auto"; }
      const h0 = modalEl.offsetHeight;
      modalEl.style.height = h0 + "px"; modalEl.style.overflow = "hidden";
      cb();
      modalEl.style.height = "auto";
      const h1 = modalEl.offsetHeight;
      if (h0 === h1) { modalEl.style.overflow = "visible"; modalEl.style.height = "auto"; return; }
      modalEl.style.height = h0 + "px"; modalEl.offsetHeight;
      modalEl.style.transitionProperty = "height,transform";
      modalEl.style.transitionDuration = "0.4s,0.3s";
      modalEl.style.transitionTimingFunction = "ease,cubic-bezier(0.175,0.885,0.32,1.275)";
      modalEl.style.height = h1 + "px";
      hAnimTimeout = setTimeout(() => {
        modalEl.style.height = "auto"; modalEl.style.overflow = "visible";
        modalEl.style.transitionProperty = "transform"; hAnimTimeout = null;
      }, 400);
    }

    function go(from, to, cb) {
      from.classList.add('step-fading-out');
      setTimeout(() => {
        animateH(() => {
          from.classList.remove('step-visible', 'step-fading-out');
          from.classList.add('step-hidden');
          to.classList.remove('step-hidden');
          to.classList.add('step-visible');
        });
        if (cb) cb();
      }, 200);
    }

    // ── PIN input ──────────────────────────────────────────────────────
    function setPinActive(circles, input, status, onComplete) {
      activePin = { circles, input, status, value: '', onComplete };
      circles.forEach(c => c.classList.remove('filled'));
      if (status) status.textContent = '';
      setTimeout(() => input.focus(), 120);
    }

    document.addEventListener('keydown', e => {
      if (!activePin) return;
      const sec = activePin.circles[0].closest('section');
      if (!sec || !sec.classList.contains('step-visible')) return;
      if (e.key === 'Backspace') {
        activePin.value = activePin.value.slice(0, -1);
      } else if (/^[0-9]$/.test(e.key) && activePin.value.length < 6) {
        activePin.value += e.key;
      } else { return; }
      e.preventDefault();
      activePin.input.value = activePin.value;
      activePin.circles.forEach((c, i) => c.classList.toggle('filled', i < activePin.value.length));
      if (activePin.value.length === 6) {
        activePin.input.blur();
        const pin = activePin.value;
        // Defer so the 6th circle paints before any async work begins
        setTimeout(() => activePin && activePin.onComplete(pin), 0);
      }
    });

    secAuthPin.addEventListener('click', () => authInput.focus());
    secProvPin.addEventListener('click', () => provInput.focus());

    // ── BLE ────────────────────────────────────────────────────────────
    function handleBLEResponse(res) {
      try {
        const data = JSON.parse(res);
        if (data.status === 'ok' && Array.isArray(data.slots)) {
          slots = data.slots; slotUIStates = {}; renderSlots();
        }
      } catch(e) {
        if (!res.startsWith("ACK:") && !res.startsWith("ERR:")) console.error("BLE parse:", res);
      }
    }

    async function fetchSlots() {
      if (bleManager) await bleManager.sendCommand("SLOTS?");
    }

    // onArrival: optional callback invoked after the section transition; when
    // provided it replaces the default dest-specific setup (fetchSlots, setPinActive).
    async function doConnect(fromSec, statusEl, dest, onArrival) {
      const setErr = msg => { statusEl.textContent = msg; statusEl.className = "status error"; };
      const afterNav = onArrival || (async () => {
        if (dest === secMain)    await fetchSlots();
        if (dest === secAuthPin) setPinActive(authCircles, authInput, stAuth, doAuthPin);
      });

      if (window.Whimbrel.DEMO_MODE) {
        slots = [
          {id:0, used:true,  counter:4821, name:"Uguisu"},
          {id:1, used:false, counter:0,    name:""},
          {id:2, used:false, counter:0,    name:""},
          {id:3, used:false, counter:0,    name:""}
        ];
        bleManager = {
          onResponse: null,
          connect: async () => {},
          disconnect: () => {},
          sendCommand: async cmd => {
            await new Promise(r => setTimeout(r, 80));
            if (cmd === "SLOTS?") {
              bleManager.onResponse && bleManager.onResponse(JSON.stringify({status:"ok", slots}));
            } else if (cmd.startsWith("RENAME:")) {
              const [, sid, name] = cmd.split(":");
              const s = slots.find(s => s.id === +sid);
              if (s) s.name = name;
              bleManager.onResponse && bleManager.onResponse(JSON.stringify({status:"ok"}));
            } else if (cmd.startsWith("REVOKE:")) {
              const s = slots.find(s => s.id === +cmd.split(":")[1]);
              if (s) { s.used = false; s.name = ""; }
              bleManager.onResponse && bleManager.onResponse(JSON.stringify({status:"ok"}));
            } else if (cmd.startsWith("PROV:")) {
              const parts = cmd.split(":");
              const s = slots.find(s => s.id === +parts[1]);
              if (s) { s.used = true; s.name = "iPhone"; }
            }
            // AUTH:, SETPIN: → always ok in demo
          }
        };
        bleManager.onResponse = handleBLEResponse;
        go(fromSec, dest, afterNav);
        return;
      }

      try {
        bleManager = new window.Whimbrel.BLEManager();
        bleManager.onResponse = handleBLEResponse;
        await bleManager.connect();
        go(fromSec, dest, afterNav);
      } catch(e) { setErr("Connection failed: " + e.message); }
    }

    // ── Auth PIN ───────────────────────────────────────────────────────
    async function doAuthPin(pin) {
      stAuth.textContent = "Authenticating..."; stAuth.className = "status";
      try {
        await bleManager.sendCommand("AUTH:" + pin);
        activePin = null;
        go(secAuthPin, secMain, () => fetchSlots());
      } catch(e) {
        stAuth.textContent = "Authentication failed: " + e.message;
        stAuth.className = "status error"; activePin = null;
      }
    }

    // ── Provision flow (stays inside the overlay) ──────────────────────
    function startGenerateFor(slotId) {
      targetSlotId = slotId;
      const label = slotId === 0 ? "Uguisu fob (slot 0)"
                  : slotId === 1 ? "owner phone (slot 1)"
                  :                `guest phone (slot ${slotId})`;
      genDescEl.textContent = `A new AES-128 key will be generated for the ${label}.`;
      go(secMain, secGenerate);
    }

    async function doGenerate() {
      // Generate the key up front — the same key shown in the animation is later
      // handed to provisionPhone via keyHex so there's no second generation.
      generatedKeyHex = window.Whimbrel.generateKey();

      go(secGenerate, secCreating, async () => {
        // ── Reset from any previous run before starting ──
        keyPreviewEl.textContent = '';
        keyPreviewEl.classList.remove('scrambling', 'revealed');
        keyPreviewEl.style.opacity = '1';
        keyPreviewEl.style.filter = 'blur(0px)';
        keyPreviewDots.style.opacity = '0';
        keyPreviewDots.style.filter = 'blur(4px)';

        // ── Scrambling animation — mirrors app.js animateKeyGeneration ──
        keyPreviewCont.style.display = 'block';
        keyPreviewDots.style.display = 'block';
        keyPreviewEl.classList.add('scrambling');
        keyPreviewEl.classList.remove('revealed');
        keyPreviewEl.style.opacity = '1';
        keyPreviewEl.style.filter = 'blur(0px)';

        const hexChars = '0123456789abcdef';
        for (let len = 1; len <= 32; len++) {
          let s = '';
          for (let j = 0; j < len; j++) s += hexChars[Math.floor(Math.random() * 16)];
          keyPreviewEl.textContent = s;
          await new Promise(r => setTimeout(r, 30));
        }
        keyPreviewEl.classList.remove('scrambling');
        await new Promise(r => setTimeout(r, 1000));
        keyPreviewEl.style.opacity = '0';
        keyPreviewEl.style.filter = 'blur(4px)';
        keyPreviewDots.style.opacity = '1';
        keyPreviewDots.style.filter = 'blur(0px)';
        await new Promise(r => setTimeout(r, 400));

        // Slot 1 always needs a PIN; no-fob flow always needs a PIN
        const needsPin = targetSlotId === 1 || isNoFobFlow;
        if (needsPin) {
          provDescEl.textContent = isNoFobFlow
            ? "Enter a 6-digit PIN. You will need this to manage keys in the Pipit app."
            : "Re-enter your PIN to provision the owner key.";
          go(secCreating, secProvPin, () => setPinActive(provCircles, provInput, stProv, doProvision));
        } else {
          // Guest slot: provision immediately without a PIN step
          await doProvisionDirect();
        }
      });
    }

    // Provision with PIN (slot 1 or no-fob flow)
    async function doProvision(pin) {
      stProv.textContent = "Generating secure keys..."; stProv.className = "status";
      try {
        // Shared crypto + BLE from prov.js — reuses the same key shown in the animation
        const { qrUrl } = await window.Whimbrel.provisionPhone({
          pin,
          slotId:    targetSlotId,
          doSetPin:  isNoFobFlow,   // only first-time setup needs SETPIN
          bleManager,               // reuse the already-connected manager
          keyHex:    generatedKeyHex
        });
        renderQR(qrUrl);
        activePin = null;
        go(secProvPin, secQR);
      } catch(e) {
        console.error(e);
        stProv.textContent = "Error: " + e.message; stProv.className = "status error";
        activePin = null;
      }
    }

    // Provision without PIN (guest slots in phone-key flow)
    async function doProvisionDirect() {
      try {
        await bleManager.sendCommand(`PROV:${targetSlotId}:${generatedKeyHex}:0:`);
        const qrUrl = `immogen://prov?slot=${targetSlotId}&key=${generatedKeyHex}&ctr=0&name=`;
        renderQR(qrUrl);
        go(secCreating, secQR);
      } catch(e) { console.error("Provision error:", e); }
    }

    function renderQR(qrUrl) {
      const qr = new QRious({ value: qrUrl, size: 300 });
      qrImg.src = qr.toDataURL('image/png');
    }

    // ── Slot tile rendering ────────────────────────────────────────────
    function mkIconBtn(svg, title, color) {
      const b = document.createElement('button');
      b.type = 'button'; b.title = title; b.innerHTML = svg;
      b.style.cssText = `background:none;border:none;cursor:pointer;color:${color||'var(--muted)'};padding:6px;border-radius:6px;line-height:0;flex-shrink:0;transition:opacity 0.15s;`;
      b.addEventListener('mouseenter', () => b.style.opacity = '0.65');
      b.addEventListener('mouseleave', () => b.style.opacity = '1');
      return b;
    }

    function roleFor(id) {
      if (id === 0) return {text:'FOB',   bg:'var(--accent,#3b82f6)'};
      if (id === 1) return {text:'OWNER', bg:'var(--success,#10b981)'};
      return             {text:'GUEST', bg:'var(--muted,#6b7280)'};
    }

    function renderSlots() {
      slotsEl.innerHTML = '';
      slots.forEach(slot => {
          const state   = slotUIStates[slot.id] || 'normal';
          const role    = roleFor(slot.id);
          const isEmpty = !slot.used;
          const isFob   = slot.id === 0;
          const locked  = isNoFobFlow && slot.id > 1; // no-fob: only slot 1 provisionable

          const tile = document.createElement('div');
          tile.style.cssText = 'background:rgba(128,128,128,0.12);padding:14px 16px;margin-bottom:10px;border-radius:10px;display:flex;align-items:center;transition:background 0.2s;';

          // ── Rename mode ──
          if (state === 'renaming') {
            tile.style.gap = '8px';
            const lbl = document.createElement('span');
            lbl.textContent = `Slot ${slot.id}:`;
            lbl.style.cssText = 'font-weight:600;font-size:1rem;flex-shrink:0;';

            const inp = document.createElement('input');
            inp.type = 'text'; inp.value = slot.name || ''; inp.maxLength = 16;
            inp.style.cssText = 'flex:1;border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:0.95rem;background:var(--surface);color:var(--text);outline:none;min-width:0;';
            setTimeout(() => { inp.focus(); inp.select(); }, 50);

            const saveBtn   = mkIconBtn(I.check, 'Save',   'var(--success,#10b981)');
            const cancelBtn = mkIconBtn(I.x,     'Cancel', 'var(--muted)');

            const doSave = async () => {
              const name = inp.value.trim();
              if (!name) return;
              await bleManager.sendCommand(`RENAME:${slot.id}:${name}`);
              slot.name = name; slotUIStates[slot.id] = 'normal'; renderSlots();
            };
            inp.addEventListener('keydown', e => {
              if (e.key === 'Enter') doSave();
              if (e.key === 'Escape') { slotUIStates[slot.id] = 'normal'; renderSlots(); }
            });
            saveBtn.addEventListener('click', doSave);
            cancelBtn.addEventListener('click', () => { slotUIStates[slot.id] = 'normal'; renderSlots(); });

            tile.append(lbl, inp, saveBtn, cancelBtn);
            slotsEl.appendChild(tile); return;
          }

          // ── Revoke confirm mode ──
          if (state === 'confirming') {
            tile.style.justifyContent = 'space-between';
            const lbl = document.createElement('span');
            lbl.textContent = `Revoke "${slot.name || 'this key'}"?`;
            lbl.style.cssText = 'font-size:0.95rem;flex:1;';

            const acts = document.createElement('div');
            acts.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button'; cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:0.85rem;cursor:pointer;color:var(--muted);';

            const revokeBtn = document.createElement('button');
            revokeBtn.type = 'button'; revokeBtn.textContent = 'Revoke';
            revokeBtn.style.cssText = 'background:var(--error,#ef4444);border:none;border-radius:6px;padding:5px 12px;font-size:0.85rem;cursor:pointer;color:#fff;font-weight:600;';

            cancelBtn.addEventListener('click', () => { slotUIStates[slot.id] = 'normal'; renderSlots(); });
            revokeBtn.addEventListener('click', async () => {
              await bleManager.sendCommand(`REVOKE:${slot.id}`);
              const s = slots.find(s => s.id === slot.id);
              if (s) { s.used = false; s.name = ''; }
              slotUIStates[slot.id] = 'normal'; renderSlots();
            });

            acts.append(cancelBtn, revokeBtn);
            tile.append(lbl, acts); slotsEl.appendChild(tile); return;
          }

          // ── Normal mode ──
          tile.style.justifyContent = 'space-between';

          const info = document.createElement('div');
          info.style.cssText = 'text-align:left;flex:1;';

          const nameLine = document.createElement('div');
          nameLine.style.cssText = `font-weight:600;font-size:1rem;color:${isEmpty||locked ? 'var(--muted)' : 'var(--text)'};`;
          nameLine.textContent = `Slot ${slot.id}: ${isEmpty ? 'Empty' : (slot.name || 'Unnamed')}`;

          const badge = document.createElement('span');
          badge.textContent = role.text;
          badge.style.cssText = `display:inline-block;margin-top:5px;background:${locked ? 'var(--muted,#6b7280)' : role.bg};color:var(--surface,#fff);padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:700;letter-spacing:0.05em;opacity:${locked ? '0.45' : '1'};`;

          info.append(nameLine, badge);

          const acts = document.createElement('div');
          acts.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;margin-left:12px;';

          if (locked) {
            const lockEl = document.createElement('span');
            lockEl.innerHTML = I.lock;
            lockEl.style.cssText = 'color:var(--muted);opacity:0.35;line-height:0;';
            acts.appendChild(lockEl);
          } else if (isEmpty && !isFob) {
            const addLbl = document.createElement('span');
            addLbl.textContent = '+ Add Phone';
            addLbl.style.cssText = 'color:var(--accent,#3b82f6);font-size:0.9rem;font-weight:500;';
            acts.appendChild(addLbl);
            tile.style.cursor = 'pointer';
            tile.addEventListener('mouseenter', () => tile.style.background = 'rgba(128,128,128,0.22)');
            tile.addEventListener('mouseleave', () => tile.style.background = 'rgba(128,128,128,0.12)');
            tile.addEventListener('click', () => startGenerateFor(slot.id));
          } else if (isFob && !isEmpty) {
            const btn = mkIconBtn(I.refresh, 'Re-provision fob');
            btn.addEventListener('click', e => { e.stopPropagation(); startGenerateFor(slot.id); });
            acts.appendChild(btn);
          } else if (!isFob && !isEmpty) {
            const pencilBtn = mkIconBtn(I.pencil, 'Rename');
            pencilBtn.addEventListener('click', e => { e.stopPropagation(); slotUIStates[slot.id] = 'renaming'; renderSlots(); });
            const xBtn = mkIconBtn(I.x, 'Revoke', 'var(--error,#ef4444)');
            xBtn.addEventListener('click', e => { e.stopPropagation(); slotUIStates[slot.id] = 'confirming'; renderSlots(); });
            acts.append(pencilBtn, xBtn);
          }

          tile.append(info, acts);
          slotsEl.appendChild(tile);
        });
    }

    // ── Navigation ─────────────────────────────────────────────────────

    $('ds-btn-connect').addEventListener('click', () => {
      isNoFobFlow = false;
      doConnect(secConnect, stConn, secAuthPin);
    });

    $('ds-btn-nofob').addEventListener('click', () => {
      isNoFobFlow = true;
      go(secConnect, secTutorial);
    });

    $('ds-btn-tut-back').addEventListener('click', () => {
      if (provisionOnDoneCallback) {
        // Came from main provisioning flow — dismiss overlay, return to prompt
        provisionOnDoneCallback = null;
        closeOverlay();
      } else {
        isNoFobFlow = false;
        go(secTutorial, secConnect, () => { stTut.textContent = ''; });
      }
    });

    $('ds-btn-tut-connect').addEventListener('click', () => {
      if (provisionOnDoneCallback) {
        // Provision mode: BLE connect → PIN directly (skip device-slots screen)
        targetSlotId = 1;
        generatedKeyHex = ''; // let provisionPhone generate the key
        provDescEl.textContent = '';
        doConnect(secTutorial, stTut, secProvPin,
          () => setPinActive(provCircles, provInput, stProv, doProvision));
      } else {
        doConnect(secTutorial, stTut, secMain);
      }
    });

    $('ds-btn-auth-back').addEventListener('click', () => {
      activePin = null;
      if (bleManager) { bleManager.disconnect(); bleManager = null; }
      go(secAuthPin, secConnect, () => { stAuth.textContent = ''; });
    });

    $('ds-btn-main-back').addEventListener('click', () => {
      const dest = isNoFobFlow ? secTutorial : secAuthPin;
      if (bleManager) { bleManager.disconnect(); bleManager = null; }
      go(secMain, dest, () => {
        if (!isNoFobFlow) setPinActive(authCircles, authInput, stAuth, doAuthPin);
      });
    });

    $('ds-btn-gen-back').addEventListener('click', () => go(secGenerate, secMain));

    $('ds-btn-prov-back').addEventListener('click', () => {
      activePin = null;
      // Reset animation state so it runs cleanly if Generate is clicked again
      keyPreviewEl.textContent = '';
      keyPreviewEl.style.opacity = '1';
      keyPreviewEl.style.filter = 'blur(0px)';
      keyPreviewDots.style.opacity = '0';
      keyPreviewDots.style.filter = 'blur(4px)';
      keyPreviewCont.style.display = 'none';
      if (provisionOnDoneCallback) {
        // Provision mode: back from PIN → return to tutorial
        go(secProvPin, secTutorial);
      } else {
        go(secProvPin, secGenerate);
      }
    });

    $('ds-btn-generate').addEventListener('click', doGenerate);

    $('ds-btn-qr-done').addEventListener('click', () => {
      if (provisionOnDoneCallback) {
        // Provision mode: close overlay, hand off to main flow's "all done" step
        const cb = provisionOnDoneCallback;
        provisionOnDoneCallback = null;
        closeOverlay();
        cb();
      } else {
        go(secQR, secMain, () => { activePin = null; fetchSlots(); });
      }
    });

    // ── Close / reset ──────────────────────────────────────────────────
    function closeOverlay() {
      const overlay = $('dashboard-overlay');
      if (overlay) overlay.classList.remove('visible');
      [secTutorial, secAuthPin, secMain, secGenerate, secCreating, secProvPin, secQR].forEach(s => {
        s.classList.remove('step-visible'); s.classList.add('step-hidden');
      });
      secConnect.classList.remove('step-hidden'); secConnect.classList.add('step-visible');
      stConn.textContent = ''; stTut.textContent = '';
      if (bleManager) { bleManager.disconnect(); bleManager = null; }
      isNoFobFlow = false; activePin = null; slotUIStates = {}; provisionOnDoneCallback = null;
    }

    $('ds-close-1').addEventListener('click', closeOverlay);
    $('ds-close-qr').addEventListener('click', closeOverlay);

    // ── Entry point for the main provisioning flow ─────────────────────
    // Called by app.js after "Yes" on the "Add Phone Key?" prompt.
    // Opens the overlay straight to ds-tutorial; when QR "Done" is tapped the
    // overlay closes and onDone() fires so the main flow can reach "All done".
    window.Whimbrel.openForProvisioning = function(onDone) {
      const overlay = $('dashboard-overlay');
      if (!overlay) return;
      provisionOnDoneCallback = onDone;
      isNoFobFlow = true;
      targetSlotId = 1;
      generatedKeyHex = '';
      stTut.textContent = '';
      // Show ds-tutorial, hide everything else
      [secConnect, secAuthPin, secMain, secGenerate, secCreating, secProvPin, secQR].forEach(s => {
        s.classList.remove('step-visible'); s.classList.add('step-hidden');
      });
      secTutorial.classList.remove('step-hidden'); secTutorial.classList.add('step-visible');
      overlay.classList.add('visible');
    };
  };

  window.Whimbrel.initDashboard = initDashboard;
})();
