/**
 * Auth Client — Dual-format token manager for migration
 *
 * Supports both:
 *   - OLD: Convex sessionId (stored as `admin_session_token`)
 *   - NEW: JWT access/refresh token pair (stored as `auth_access_token` + `auth_refresh_token`)
 *
 * The client auto-detects which format is in use and handles the transition.
 */

const STORAGE_KEYS = {
  LEGACY_TOKEN: "admin_session_token",
  ACCESS_TOKEN: "auth_access_token",
  REFRESH_TOKEN: "auth_refresh_token",
  TOKEN_TYPE: "auth_token_type", // "legacy" | "jwt"
  EXPIRES_AT: "auth_expires_at",
} as const;

const REFRESH_ENDPOINT = "/api/auth/refresh";
const REFRESH_THRESHOLD_MS = 60_000; // Refresh if expiring within 1 minute

// ── Token Storage ──

export type TokenType = "legacy" | "jwt";

export function getStoredTokenType(): TokenType {
  if (typeof window === "undefined") return "legacy";
  return (localStorage.getItem(STORAGE_KEYS.TOKEN_TYPE) as TokenType) || "legacy";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const type = getStoredTokenType();
  if (type === "jwt") return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  return localStorage.getItem(STORAGE_KEYS.LEGACY_TOKEN);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function setJwtTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(STORAGE_KEYS.TOKEN_TYPE, "jwt");
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(Date.now() + expiresIn * 1000));
  localStorage.removeItem(STORAGE_KEYS.LEGACY_TOKEN);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

export function isTokenExpired(): boolean {
  if (typeof window === "undefined") return true;
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  if (!expiresAt) return true;
  return Date.now() > Number(expiresAt) - REFRESH_THRESHOLD_MS;
}

// ── Token Refresh ──

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(REFRESH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const data = await res.json();
      setJwtTokens(data.accessToken, data.refreshToken, data.expiresIn);
      return data.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Auth Fetch Wrapper ──

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Wraps fetch() with automatic Bearer token header and 401 → refresh flow.
 *
 * Usage:
 *   const data = await authFetch('/api/admin/audit-log');
 *   const data = await authFetch('/api/admin/audit-log', { method: 'POST', body: ... });
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken();

  // Prepare headers
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(url, { ...options, headers });

  // ── 401 → attempt token refresh → retry ──
  if (res.status === 401 && getStoredTokenType() === "jwt") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers });
    } else {
      // Refresh failed → trigger redirect to login
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = window.location.pathname.startsWith("/admin") ? "/admin/login" : "/auth";
      }
      throw new AuthError("Session expired. Please log in again.", 401);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new AuthError(body.error || res.statusText, res.status);
  }

  return res.json();
}

// ── Auth State Check (for frontend components) ──

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = getAccessToken();
  if (!token) return false;

  // Legacy token is valid as long as it exists (no expiry check)
  if (getStoredTokenType() === "legacy") return true;

  // JWT token: check storage expiry (server validates expiry on use)
  return !isTokenExpired();
}
