// We use Web Crypto API (supported in both Convex V8 and Node runtimes)
// No "use node" needed if we use globalThis.crypto

/**
 * Masks sensitive data for logging
 */
export function maskAccountNumber(accountNumber: string) {
    if (!accountNumber) return "****";
    return accountNumber.slice(0, 2) + "*".repeat(accountNumber.length - 6) + accountNumber.slice(-4);
}

export function maskAccountName(name: string) {
    if (!name) return "****";
    return name[0] + "*".repeat(name.length - 2) + name.slice(-1);
}

/**
 * Converts hex string to Uint8Array
 */
function hexToUint8Array(hex: string) {
    const match = hex.match(/.{1,2}/g);
    if (!match) return new Uint8Array(0);
    return new Uint8Array(match.map(byte => parseInt(byte, 16)));
}

/**
 * Converts Uint8Array to hex string
 */
function uint8ArrayToHex(bytes: Uint8Array) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts sensitive text using AES-256-GCM (Web Crypto)
 */
export async function encryptWeb(text: string, keyHex: string) {
    const keyBytes = hexToUint8Array(keyHex);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const key = await globalThis.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );

    const encryptedContent = await globalThis.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        data
    );

    const fullBuffer = new Uint8Array(encryptedContent);
    // AES-GCM tag is the last 16 bytes of the output in Web Crypto
    const tag = fullBuffer.slice(-16);
    const encrypted = fullBuffer.slice(0, -16);

    return {
        encrypted: uint8ArrayToHex(encrypted),
        iv: uint8ArrayToHex(iv),
        tag: uint8ArrayToHex(tag)
    };
}

/**
 * Decrypts text encrypted with AES-256-GCM (Web Crypto)
 */
/**
 * Hashes a password using PBKDF2-SHA-256 (Web Crypto)
 * Returns a hex-encoded string containing: salt:hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hash = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}

/**
 * Verifies a password against a PBKDF2 hash created by hashPassword
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hash = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  const computedHex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return computedHex === hashHex;
}

export async function decryptWeb(encryptedHex: string, ivHex: string, tagHex: string, keyHex: string) {
    const keyBytes = hexToUint8Array(keyHex);
    const iv = hexToUint8Array(ivHex);
    const tag = hexToUint8Array(tagHex);
    const encrypted = hexToUint8Array(encryptedHex);

    // Combine encrypted data and tag for Web Crypto decrypt
    const dataWithTag = new Uint8Array(encrypted.length + tag.length);
    dataWithTag.set(encrypted);
    dataWithTag.set(tag, encrypted.length);

    const key = await globalThis.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decrypted = await globalThis.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        dataWithTag
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
