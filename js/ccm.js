/**
 * AES-CCM Encryption implementation using pure JS (requires aes-js for ECB)
 */

(function() {
  const L = 2;
  const M = 8;
  const NONCE_LEN = 13;

  function xorBlock(dst, a, b, offsetA = 0, offsetB = 0) {
    for (let i = 0; i < 16; i++) {
      dst[i] = a[offsetA + i] ^ b[offsetB + i];
    }
  }

  window.Whimbrel.encryptAESCCM = function(key, nonce, msg) {
    if (key.length !== 16) throw new Error("Key must be 16 bytes");
    if (nonce.length < NONCE_LEN) throw new Error("Nonce must be at least 13 bytes");
    
    // We use aesjs for ECB encryption
    const aesEcb = new aesjs.ModeOfOperation.ecb(key);
    
    const payloadLen = msg.length;
    const aadLen = 0;
    
    const flagsB0 = (((M - 2) / 2) << 3) | (L - 1);
    
    const b0 = new Uint8Array(16);
    b0[0] = flagsB0;
    b0.set(nonce.slice(0, NONCE_LEN), 1);
    b0[14] = (payloadLen >> 8) & 0xFF;
    b0[15] = payloadLen & 0xFF;
    
    const x = new Uint8Array(16);
    const tmp = new Uint8Array(16);
    
    xorBlock(tmp, x, b0);
    x.set(aesEcb.encrypt(tmp));
    
    let payloadIdx = 0;
    while (payloadIdx < payloadLen) {
      const block = new Uint8Array(16);
      const n = Math.min(16, payloadLen - payloadIdx);
      block.set(msg.slice(payloadIdx, payloadIdx + n));
      xorBlock(tmp, x, block);
      x.set(aesEcb.encrypt(tmp));
      payloadIdx += n;
    }
    
    const a0 = new Uint8Array(16);
    a0[0] = L - 1;
    a0.set(nonce.slice(0, NONCE_LEN), 1);
    
    const s0 = aesEcb.encrypt(a0);
    
    const outMic = new Uint8Array(M);
    for (let i = 0; i < M; i++) {
      outMic[i] = x[i] ^ s0[i];
    }
    
    const outCt = new Uint8Array(payloadLen);
    let offsetEnc = 0;
    let ctrI = 1;
    
    while (offsetEnc < payloadLen) {
      const ai = new Uint8Array(16);
      ai[0] = L - 1;
      ai.set(nonce.slice(0, NONCE_LEN), 1);
      ai[14] = (ctrI >> 8) & 0xFF;
      ai[15] = ctrI & 0xFF;
      
      const si = aesEcb.encrypt(ai);
      const n = Math.min(16, payloadLen - offsetEnc);
      
      for (let j = 0; j < n; j++) {
        outCt[offsetEnc + j] = msg[offsetEnc + j] ^ si[j];
      }
      
      offsetEnc += n;
      ctrI++;
    }
    
    const result = new Uint8Array(payloadLen + M);
    result.set(outCt, 0);
    result.set(outMic, payloadLen);
    return result;
  };

  // Convert Uint8Array to Hex string
  window.Whimbrel.bufToHex = function(buf) {
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  };
  
  // Convert Hex string to Uint8Array
  window.Whimbrel.hexToBuf = function(hex) {
    const bytes = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  };
})();