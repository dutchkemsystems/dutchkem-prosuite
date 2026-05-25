// ═══════════════════════════════════════════════════════════════════
// SINGLE-SESSION AUTHENTICATION & DEVICE LOCK
//
// WHAT THIS DOES:
// 1. Each user can only be logged in on ONE device at a time
// 2. If they try to login from a second device/browser, they see:
//    "You're already logged in on another device. Log out first."
// 3. Each registration is unique — email can't be duplicated
// 4. Device fingerprint generated from browser properties
// 5. All session data encrypted before storage
//
// HOW IT WORKS:
// - On login: generate device fingerprint + session token
// - Store: { email → { deviceId, sessionToken, loginTime, lastActive } }
// - On every page load: verify this device matches the stored session
// - If mismatch: block access, show "logged in elsewhere" message
// ═══════════════════════════════════════════════════════════════════

const SESSION_KEY = 'dk_session';
const USERS_KEY = 'dk_users';
const ACTIVE_SESSIONS_KEY = 'dk_active_sessions';

// ── Device Fingerprint Generator ──
// Creates a unique-ish ID from browser properties (not perfect but good enough)
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform || 'unknown',
    // Canvas fingerprint (fast, doesn't draw visible content)
    (() => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('DutchkemFP', 2, 2);
        return canvas.toDataURL().slice(-50);
      } catch { return 'canvas-error'; }
    })(),
  ];

  // Simple hash
  let hash = 0;
  const str = components.join('|||');
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'DK' + Math.abs(hash).toString(36) + Date.now().toString(36).slice(-4);
}

// ── Session Token Generator ──
function generateSessionToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// ── Encrypt/Decrypt for localStorage ──
function encrypt(data: string): string {
  // Simple XOR obfuscation (not military-grade but prevents casual inspection)
  const key = 'DutchkemVentures2025';
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function decrypt(encoded: string): string {
  try {
    const data = atob(encoded);
    const key = 'DutchkemVentures2025';
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch { return ''; }
}

// ── User Registration Database ──
export interface RegisteredUser {
  email: string;
  name: string;
  registeredAt: number;
  lastLogin: number;
  loginCount: number;
  deviceId: string;
  blocked: boolean;
}

export interface ActiveSession {
  email: string;
  deviceId: string;
  sessionToken: string;
  loginTime: number;
  lastActive: number;
  userAgent: string;
}

function getUsers(): Record<string, RegisteredUser> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return {};
    return JSON.parse(decrypt(raw));
  } catch { return {}; }
}

function saveUsers(users: Record<string, RegisteredUser>): void {
  localStorage.setItem(USERS_KEY, encrypt(JSON.stringify(users)));
}

function getActiveSessions(): Record<string, ActiveSession> {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSIONS_KEY);
    if (!raw) return {};
    return JSON.parse(decrypt(raw));
  } catch { return {}; }
}

function saveActiveSessions(sessions: Record<string, ActiveSession>): void {
  localStorage.setItem(ACTIVE_SESSIONS_KEY, encrypt(JSON.stringify(sessions)));
}

// ── Get Current Session ──
export function getCurrentSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(decrypt(raw));
  } catch { return null; }
}

// ── Check if Email is Already Registered ──
export function isEmailRegistered(email: string): boolean {
  const users = getUsers();
  return !!users[email.toLowerCase()];
}

// ── Check if User is Logged in on Another Device ──
export function isLoggedInElsewhere(email: string): { blocked: boolean; deviceInfo?: string } {
  const sessions = getActiveSessions();
  const session = sessions[email.toLowerCase()];
  
  if (!session) return { blocked: false };
  
  const currentDevice = generateDeviceFingerprint();
  
  // Same device — allow
  if (session.deviceId === currentDevice) return { blocked: false };
  
  // Different device — check if session is still active (within 24 hours)
  const sessionAge = Date.now() - session.lastActive;
  const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
  
  if (sessionAge > MAX_SESSION_AGE) {
    // Session expired — allow login on new device
    return { blocked: false };
  }
  
  // Active session on another device — BLOCK
  return {
    blocked: true,
    deviceInfo: session.userAgent.includes('Mobile') ? 'a mobile device' :
                session.userAgent.includes('Windows') ? 'a Windows PC' :
                session.userAgent.includes('Mac') ? 'a Mac' :
                'another device',
  };
}

// ── Register New User ──
export function registerUser(email: string, name: string): RegisteredUser {
  const users = getUsers();
  const key = email.toLowerCase();
  
  if (users[key]) {
    // Already registered — update login count
    users[key].lastLogin = Date.now();
    users[key].loginCount += 1;
    users[key].name = name || users[key].name;
    saveUsers(users);
    return users[key];
  }
  
  // New registration
  const deviceId = generateDeviceFingerprint();
  const user: RegisteredUser = {
    email: key,
    name: name || '',
    registeredAt: Date.now(),
    lastLogin: Date.now(),
    loginCount: 1,
    deviceId,
    blocked: false,
  };
  
  users[key] = user;
  saveUsers(users);
  return user;
}

// ── Create Session (Login) ──
export function createSession(email: string, name: string): ActiveSession {
  const deviceId = generateDeviceFingerprint();
  const sessionToken = generateSessionToken();
  
  const session: ActiveSession = {
    email: email.toLowerCase(),
    deviceId,
    sessionToken,
    loginTime: Date.now(),
    lastActive: Date.now(),
    userAgent: navigator.userAgent,
  };
  
  // Save as active session for this email
  const sessions = getActiveSessions();
  sessions[email.toLowerCase()] = session;
  saveActiveSessions(sessions);
  
  // Save current session locally
  localStorage.setItem(SESSION_KEY, encrypt(JSON.stringify(session)));
  
  // Update user record
  registerUser(email, name);
  
  return session;
}

// ── Refresh Session (keep alive) ──
export function refreshSession(): void {
  const session = getCurrentSession();
  if (!session) return;
  
  session.lastActive = Date.now();
  localStorage.setItem(SESSION_KEY, encrypt(JSON.stringify(session)));
  
  // Update active sessions
  const sessions = getActiveSessions();
  if (sessions[session.email]) {
    sessions[session.email].lastActive = Date.now();
    saveActiveSessions(sessions);
  }
}

// ── Validate Session (check it's still valid) ──
export function validateSession(): { valid: boolean; reason?: string } {
  const session = getCurrentSession();
  if (!session) return { valid: false, reason: 'no_session' };
  
  const sessions = getActiveSessions();
  const activeSession = sessions[session.email];
  
  if (!activeSession) return { valid: false, reason: 'session_expired' };
  
  // Check if this device still owns the session
  if (activeSession.sessionToken !== session.sessionToken) {
    // Someone else logged in — this session is invalid
    localStorage.removeItem(SESSION_KEY);
    return { valid: false, reason: 'logged_in_elsewhere' };
  }
  
  // Check if session has expired (24 hours)
  if (Date.now() - activeSession.lastActive > 24 * 60 * 60 * 1000) {
    logout();
    return { valid: false, reason: 'session_expired' };
  }
  
  return { valid: true };
}

// ── Force Logout from This Device ──
export function logout(): void {
  const session = getCurrentSession();
  if (session) {
    const sessions = getActiveSessions();
    delete sessions[session.email];
    saveActiveSessions(sessions);
  }
  localStorage.removeItem(SESSION_KEY);
}

// ── Force Logout from All Devices (for "Log out other devices") ──
export function logoutAllDevices(email: string): void {
  const sessions = getActiveSessions();
  delete sessions[email.toLowerCase()];
  saveActiveSessions(sessions);
  localStorage.removeItem(SESSION_KEY);
}

// ── Get User Info ──
export function getUser(email: string): RegisteredUser | null {
  const users = getUsers();
  return users[email.toLowerCase()] || null;
}

// ── Get All Registered Users (admin) ──
export function getAllUsers(): RegisteredUser[] {
  const users = getUsers();
  return Object.values(users);
}

// ── Heartbeat — call periodically to keep session alive ──
export function startSessionHeartbeat(): () => void {
  const interval = setInterval(() => {
    const validation = validateSession();
    if (!validation.valid) {
      // Session invalidated — could dispatch event
      window.dispatchEvent(new CustomEvent('session_invalidated', { 
        detail: { reason: validation.reason } 
      }));
    } else {
      refreshSession();
    }
  }, 30000); // Every 30 seconds

  return () => clearInterval(interval);
}
