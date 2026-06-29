/**
 * Pure JS crypto utilities for Convex actions.
 * Convex action runtime does NOT have access to crypto.subtle.
 */

// ═══════════════════════════════════════════════════════════════
// SHA-256
// ═══════════════════════════════════════════════════════════════

const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256(message: Uint8Array): Uint8Array {
  const msgLen = message.length;
  const bitLen = msgLen * 8;
  const padLen = (msgLen % 64 < 56) ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(message);
  padded[msgLen] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(msgLen + padLen, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(msgLen + padLen + 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i-15]>>>7)|(w[i-15]<<25)) ^ ((w[i-15]>>>18)|(w[i-15]<<14)) ^ (w[i-15]>>>3);
      const s1 = ((w[i-2]>>>17)|(w[i-2]<<15)) ^ ((w[i-2]>>>19)|(w[i-2]<<13)) ^ (w[i-2]>>>10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let a=h0, b=h1, c=h2, d=h3, e=h4, f=h5, g=h6, h=h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e>>>6)|(e<<26)) ^ ((e>>>11)|(e<<21)) ^ ((e>>>25)|(e<<7));
      const ch = (e&f) ^ (~e&g);
      const t1 = (h + S1 + ch + K256[i] + w[i]) | 0;
      const S0 = ((a>>>2)|(a<<30)) ^ ((a>>>13)|(a<<19)) ^ ((a>>>22)|(a<<10));
      const maj = (a&b) ^ (a&c) ^ (b&c);
      const t2 = (S0 + maj) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0;
    h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+h)|0;
  }

  const hash = new Uint8Array(32);
  const hv = new DataView(hash.buffer);
  hv.setUint32(0,h0,false); hv.setUint32(4,h1,false); hv.setUint32(8,h2,false); hv.setUint32(12,h3,false);
  hv.setUint32(16,h4,false); hv.setUint32(20,h5,false); hv.setUint32(24,h6,false); hv.setUint32(28,h7,false);
  return hash;
}

// ═══════════════════════════════════════════════════════════════
// SHA-1 (needed for TOTP HMAC-SHA1)
// ═══════════════════════════════════════════════════════════════

function sha1(message: Uint8Array): Uint8Array {
  const msgLen = message.length;
  const bitLen = msgLen * 8;
  const padLen = (msgLen % 64 < 56) ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(message);
  padded[msgLen] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(msgLen + padLen, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(msgLen + padLen + 4, bitLen >>> 0, false);

  let h0=0x67452301, h1=0xEFCDAB89, h2=0x98BADCFE, h3=0x10325476, h4=0xC3D2E1F0;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Array(80);
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 80; i++) w[i] = ((w[i-3]^w[i-8]^w[i-14]^w[i-16])<<1)|((w[i-3]^w[i-8]^w[i-14]^w[i-16])>>>31);

    let a=h0, b=h1, c=h2, d=h3, e=h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i<20) { f=(b&c)|(~b&d); k=0x5A827999; }
      else if (i<40) { f=b^c^d; k=0x6ED9EBA1; }
      else if (i<60) { f=(b&c)|(b&d)|(c&d); k=0x8F1BBCDC; }
      else { f=b^c^d; k=0xCA62C1D6; }
      const temp = (((a<<5)|(a>>>27))+f+e+k+w[i])|0;
      e=d; d=c; c=(b<<30)|(b>>>2); b=a; a=temp;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0; h4=(h4+e)|0;
  }

  const hash = new Uint8Array(20);
  const hv = new DataView(hash.buffer);
  hv.setUint32(0,h0,false); hv.setUint32(4,h1,false); hv.setUint32(8,h2,false);
  hv.setUint32(12,h3,false); hv.setUint32(16,h4,false);
  return hash;
}

// ═══════════════════════════════════════════════════════════════
// HMAC
// ═══════════════════════════════════════════════════════════════

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const bs = 64;
  let kb = key.length > bs ? sha256(key) : key;
  const kp = new Uint8Array(bs);
  kp.set(kb);
  const ipad = new Uint8Array(bs), opad = new Uint8Array(bs);
  for (let i = 0; i < bs; i++) { ipad[i] = kp[i]^0x36; opad[i] = kp[i]^0x5c; }
  const inner = new Uint8Array(bs + message.length);
  inner.set(ipad); inner.set(message, bs);
  const ih = sha256(inner);
  const outer = new Uint8Array(bs + 32);
  outer.set(opad); outer.set(ih, bs);
  return sha256(outer);
}

function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const bs = 64;
  let kb = key.length > bs ? sha1(key) : key;
  const kp = new Uint8Array(bs);
  kp.set(kb);
  const ipad = new Uint8Array(bs), opad = new Uint8Array(bs);
  for (let i = 0; i < bs; i++) { ipad[i] = kp[i]^0x36; opad[i] = kp[i]^0x5c; }
  const inner = new Uint8Array(bs + message.length);
  inner.set(ipad); inner.set(message, bs);
  const ih = sha1(inner);
  const outer = new Uint8Array(bs + 20);
  outer.set(opad); outer.set(ih, bs);
  return sha1(outer);
}

export function hmacSign(algo: "SHA-256" | "SHA-1", key: Uint8Array, data: Uint8Array): Uint8Array {
  return algo === "SHA-256" ? hmacSha256(key, data) : hmacSha1(key, data);
}

export function hmacVerify(algo: "SHA-256" | "SHA-1", key: Uint8Array, sig: Uint8Array, data: Uint8Array): boolean {
  const computed = hmacSign(algo, key, data);
  if (computed.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed[i] ^ sig[i];
  return diff === 0;
}

// ═══════════════════════════════════════════════════════════════
// PBKDF2-SHA-256
// ═══════════════════════════════════════════════════════════════

async function pbkdf2(password: string, salt: Uint8Array, iterations: number, keyLength: number): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  const hl = 32;
  const blocks = Math.ceil(keyLength / hl);
  const result = new Uint8Array(blocks * hl);

  for (let block = 1; block <= blocks; block++) {
    const blockBytes = new Uint8Array(salt.length + 4);
    blockBytes.set(salt);
    new DataView(blockBytes.buffer).setUint32(salt.length, block, false);
    let u = hmacSha256(passwordBytes, blockBytes);
    const t = new Uint8Array(u);
    for (let i = 1; i < iterations; i++) {
      u = hmacSha256(passwordBytes, u);
      for (let j = 0; j < hl; j++) t[j] ^= u[j];
    }
    result.set(t, (block - 1) * hl);
  }
  return result.slice(0, keyLength);
}

export async function hashPasswordPure(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  for (let i = 0; i < 16; i++) salt[i] = Math.floor(Math.random() * 256);
  const hash = await pbkdf2(password, salt, 100000, 32);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

export async function verifyPasswordPure(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  const hash = await pbkdf2(password, salt, 100000, 32);
  const computedHex = Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
  return computedHex === hashHex;
}

export function getRandomValues(array: Uint8Array): Uint8Array {
  for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
  return array;
}
