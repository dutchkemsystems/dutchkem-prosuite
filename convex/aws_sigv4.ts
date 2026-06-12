// ═══════════════════════════════════════════════════════════════════
// AWS Signature Version 4 — Shared Signing Module
// Provides proper SHA-256 and HMAC-SHA256 for AWS API authentication
// Used by: aws_otp.ts, TermiiOTP.ts, otp_email.ts, http.ts
// ═══════════════════════════════════════════════════════════════════

// ─── SHA-256 Constants ──────────────────────────────────────────
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const H0 = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Block(block: Uint8Array, state: number[]): void {
  const w = new Array(64);
  for (let i = 0; i < 16; i++) {
    w[i] =
      (block[i * 4] << 24) |
      (block[i * 4 + 1] << 16) |
      (block[i * 4 + 2] << 8) |
      block[i * 4 + 3];
  }
  for (let i = 16; i < 64; i++) {
    const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
    const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
  }

  let [a, b, c, d, e, f, g, h] = state;

  for (let i = 0; i < 64; i++) {
    const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
    const ch = (e & f) ^ (~e & g);
    const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
    const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
    const maj = (a & b) ^ (a & c) ^ (b & c);
    const temp2 = (S0 + maj) | 0;

    h = g;
    g = f;
    f = e;
    e = (d + temp1) | 0;
    d = c;
    c = b;
    b = a;
    a = (temp1 + temp2) | 0;
  }

  state[0] = (state[0] + a) | 0;
  state[1] = (state[1] + b) | 0;
  state[2] = (state[2] + c) | 0;
  state[3] = (state[3] + d) | 0;
  state[4] = (state[4] + e) | 0;
  state[5] = (state[5] + f) | 0;
  state[6] = (state[6] + g) | 0;
  state[7] = (state[7] + h) | 0;
}

export function sha256(data: string | Uint8Array): Uint8Array {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data;

  const totalLen = bytes.length;
  const bitLen = totalLen * 8;
  const padLen = ((totalLen + 8) % 64 === 0) ? 0 : 64 - ((totalLen + 8) % 64);
  const padded = new Uint8Array(totalLen + 1 + padLen + 8);

  padded.set(bytes);
  padded[totalLen] = 0x80;

  // Length in bits (big-endian 64-bit)
  padded[padded.length - 8] = (bitLen >>> 56) & 0xff;
  padded[padded.length - 7] = (bitLen >>> 48) & 0xff;
  padded[padded.length - 6] = (bitLen >>> 40) & 0xff;
  padded[padded.length - 5] = (bitLen >>> 32) & 0xff;
  padded[padded.length - 4] = (bitLen >>> 24) & 0xff;
  padded[padded.length - 3] = (bitLen >>> 16) & 0xff;
  padded[padded.length - 2] = (bitLen >>> 8) & 0xff;
  padded[padded.length - 1] = bitLen & 0xff;

  const state = [...H0];

  for (let offset = 0; offset < padded.length; offset += 64) {
    sha256Block(padded.slice(offset, offset + 64), state);
  }

  const result = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    result[i * 4] = (state[i] >>> 24) & 0xff;
    result[i * 4 + 1] = (state[i] >>> 16) & 0xff;
    result[i * 4 + 2] = (state[i] >>> 8) & 0xff;
    result[i * 4 + 3] = state[i] & 0xff;
  }

  return result;
}

export function sha256Hex(data: string | Uint8Array): string {
  const hash = sha256(data);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── HMAC-SHA256 ────────────────────────────────────────────────
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const BLOCK_SIZE = 64;

  let keyBytes = key;
  if (key.length > BLOCK_SIZE) {
    keyBytes = sha256(key);
  }

  const paddedKey = new Uint8Array(BLOCK_SIZE);
  paddedKey.set(keyBytes);

  const ipad = new Uint8Array(BLOCK_SIZE);
  const opad = new Uint8Array(BLOCK_SIZE);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  const innerData = new Uint8Array(BLOCK_SIZE + message.length);
  innerData.set(ipad);
  innerData.set(message, BLOCK_SIZE);
  const innerHash = sha256(innerData);

  const outerData = new Uint8Array(BLOCK_SIZE + 32);
  outerData.set(opad);
  outerData.set(innerHash, BLOCK_SIZE);
  return sha256(outerData);
}

export function hmacSha256Hex(key: Uint8Array, message: string): string {
  const msgBytes = new TextEncoder().encode(message);
  const hash = hmacSha256(key, msgBytes);
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── AWS SigV4 Key Derivation ──────────────────────────────────
export function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Uint8Array {
  const kDate = hmacSha256(
    new TextEncoder().encode("AWS4" + secretKey),
    new TextEncoder().encode(dateStamp),
  );
  const kRegion = hmacSha256(kDate, new TextEncoder().encode(region));
  const kService = hmacSha256(kRegion, new TextEncoder().encode(service));
  return hmacSha256(kService, new TextEncoder().encode("aws4_request"));
}

// ─── Base64 Encoding ────────────────────────────────────────────
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function encodeBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += B64_CHARS[(triplet >> 18) & 0x3f];
    result += B64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < bytes.length ? B64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += i + 2 < bytes.length ? B64_CHARS[triplet & 0x3f] : "=";
  }
  return result;
}

// ─── Full SigV4 Request Signing ─────────────────────────────────
export interface SigV4Headers {
  "Content-Type": string;
  Host: string;
  "X-Amz-Date": string;
  "X-Amz-Content-Sha256": string;
  Authorization: string;
}

export function signRequest(
  method: string,
  host: string,
  path: string,
  region: string,
  service: string,
  payload: string,
  accessKey: string,
  secretKey: string,
  contentType: string,
): SigV4Headers {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const payloadHash = sha256Hex(payload);

  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const canonicalRequestHash = sha256Hex(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signatureBytes = hmacSha256(
    signingKey,
    new TextEncoder().encode(stringToSign),
  );
  const signature = Array.from(signatureBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    "Content-Type": contentType,
    Host: host,
    "X-Amz-Date": amzDate,
    "X-Amz-Content-Sha256": payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
