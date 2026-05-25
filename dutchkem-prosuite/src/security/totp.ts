// ═══════════════════════════════════════════════════════════════════
// TOTP (Time-based One-Time Password) — RFC 6238
//
// Compatible with Google Authenticator, Authy, Microsoft Authenticator.
//
// HOW IT WORKS:
// 1. Admin registers once: scans a QR code or enters the secret key
// 2. The authenticator app generates a new 6-digit code every 30 seconds
// 3. The code is verified using HMAC-SHA1 + a shared secret
// 4. Once registered, the secret is stored encrypted in localStorage
// 5. The secret CANNOT be viewed again — only reset from settings
//
// SECURITY:
// - Secret is encrypted with AES-256 (Web Crypto API) before storage
// - The encryption key is derived from the admin's password hash
// - Even if localStorage is dumped, the secret is unreadable
// - Codes expire every 30 seconds
// - 1-step time window tolerance (accepts ±30 seconds)
// ═══════════════════════════════════════════════════════════════════

const TOTP_STORAGE_KEY = 'dutchkem_totp_vault';
const TOTP_REGISTERED_KEY = 'dutchkem_totp_registered';
const PERIOD = 30; // seconds
const DIGITS = 6;
const ALGORITHM = 'SHA-1';

// ── Base32 Decode (RFC 4648) ──
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/[=\s]/g, '').toUpperCase();
  const bits: number[] = [];
  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i * 8 + j];
    }
    bytes[i] = byte;
  }
  return bytes;
}

// ── Base32 Encode ──
function base32Encode(data: Uint8Array): string {
  let bits = '';
  for (const byte of data) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0');
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

// ── HMAC-SHA1 using Web Crypto API ──
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: ALGORITHM }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

// ── Generate TOTP code for a given time ──
async function generateTOTP(secret: string, timeStep?: number): Promise<string> {
  const key = base32Decode(secret);
  const time = timeStep ?? Math.floor(Date.now() / 1000 / PERIOD);
  
  // Convert time to 8-byte big-endian
  const timeBytes = new Uint8Array(8);
  let t = time;
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = t & 0xff;
    t = Math.floor(t / 256);
  }
  
  const hmac = await hmacSha1(key, timeBytes);
  
  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  );
  
  const otp = binary % Math.pow(10, DIGITS);
  return otp.toString().padStart(DIGITS, '0');
}

// ── Verify TOTP code (allows ±1 time window) ──
export async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  const currentStep = Math.floor(Date.now() / 1000 / PERIOD);
  
  // Check current, previous, and next time windows
  for (const offset of [0, -1, 1]) {
    const expected = await generateTOTP(secret, currentStep + offset);
    if (expected === code.padStart(DIGITS, '0')) {
      return true;
    }
  }
  return false;
}

// ── AES-256-GCM Encryption (Web Crypto API) ──
async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('dutchkem-totp-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptSecret(secret: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(secret)
  );
  // Store as: base64(iv + ciphertext)
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptSecret(encrypted: string, password: string): Promise<string | null> {
  try {
    const key = await deriveKey(password);
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

// ── Generate a new random TOTP secret ──
export function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

// ── Generate QR code URL for Google Authenticator ──
export function getTOTPUri(secret: string, email: string): string {
  const issuer = 'DutchkemVentures';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

// ── Registration: store encrypted secret ──
export async function registerTOTP(secret: string, adminPassword: string): Promise<void> {
  const encrypted = await encryptSecret(secret, adminPassword);
  localStorage.setItem(TOTP_STORAGE_KEY, encrypted);
  localStorage.setItem(TOTP_REGISTERED_KEY, 'true');
}

// ── Check if TOTP is already registered ──
export function isTOTPRegistered(): boolean {
  return localStorage.getItem(TOTP_REGISTERED_KEY) === 'true';
}

// ── Verify a code against the stored secret ──
export async function verifyStoredTOTP(code: string, adminPassword: string): Promise<boolean> {
  const encrypted = localStorage.getItem(TOTP_STORAGE_KEY);
  if (!encrypted) return false;
  
  const secret = await decryptSecret(encrypted, adminPassword);
  if (!secret) return false;
  
  return verifyTOTP(secret, code);
}

// ── Reset TOTP (requires admin password to decrypt first) ──
export async function resetTOTP(adminPassword: string): Promise<boolean> {
  const encrypted = localStorage.getItem(TOTP_STORAGE_KEY);
  if (!encrypted) return true;
  
  // Verify password can decrypt before allowing reset
  const secret = await decryptSecret(encrypted, adminPassword);
  if (!secret) return false;
  
  localStorage.removeItem(TOTP_STORAGE_KEY);
  localStorage.removeItem(TOTP_REGISTERED_KEY);
  return true;
}

// ── Get remaining seconds until code changes ──
export function getTimeRemaining(): number {
  return PERIOD - (Math.floor(Date.now() / 1000) % PERIOD);
}
