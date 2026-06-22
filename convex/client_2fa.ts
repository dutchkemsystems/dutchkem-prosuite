import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════
// CLIENT 2FA — TOTP (Google Authenticator) Support
// ═══════════════════════════════════════════════════════════════

/** Generate a TOTP secret for a client */
export const generateClientSecret = mutation({
  args: {},
  returns: v.object({ secret: v.string() }),
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    const rand = new Uint8Array(20);
    globalThis.crypto.getRandomValues(rand);
    for (let i = 0; i < 20; i++) secret += chars[rand[i] % 32];
    return { secret };
  },
});

/** Setup 2FA for a client */
export const setupClient2FA = mutation({
  args: { userId: v.id("users"), secret: v.string() },
  returns: v.any(),
  handler: async (ctx, { userId, secret }) => {
    if (!/^[A-Z2-7]{20}$/.test(secret)) {
      throw new Error("Invalid 2FA secret format");
    }
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).slice(2, 10).toUpperCase()
    );
    const existing = await ctx.db.query("client_2fa").withIndex("by_user", (q: any) => q.eq("userId", userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { secret, backupCodes, isEnabled: true });
    } else {
      await ctx.db.insert("client_2fa", { userId, secret, backupCodes, isEnabled: true });
    }
    await ctx.db.patch("users", userId, { twoFactorEnabled: true, twoFactorSecret: secret });
    return { backupCodes };
  },
});

/** Verify TOTP code for client */
export const verifyClientTOTP = mutation({
  args: { userId: v.id("users"), totpCode: v.string() },
  returns: v.any(),
  handler: async (ctx, { userId, totpCode }) => {
    const twoFactor = await ctx.db.query("client_2fa").withIndex("by_user", (q: any) => q.eq("userId", userId)).first();
    if (!twoFactor || !twoFactor.isEnabled) return false;

    // Check backup codes
    if (totpCode.length >= 8) {
      const idx = twoFactor.backupCodes.indexOf(totpCode.toUpperCase());
      if (idx !== -1) {
        const codes = [...twoFactor.backupCodes];
        codes.splice(idx, 1);
        await ctx.db.patch("client_2fa", twoFactor._id, { backupCodes: codes });
        return true;
      }
    }

    // Verify TOTP (RFC 6238)
    if (totpCode.length === 6 && /^\d{6}$/.test(totpCode)) {
      const secret = twoFactor.secret;
      const window = 1;
      const timeStep = Math.floor(Date.now() / 30000);
      
      for (let i = -window; i <= window; i++) {
        const computed = await computeTOTP(secret, timeStep + i);
        if (computed === totpCode) return true;
      }
    }
    return false;
  },
});

/** Check if client has 2FA enabled */
export const checkClient2FA = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, { userId }) => {
    const twoFactor = await ctx.db.query("client_2fa").withIndex("by_user", (q: any) => q.eq("userId", userId)).first();
    return { enabled: twoFactor?.isEnabled ?? false, hasSecret: !!twoFactor?.secret };
  },
});

// TOTP computation (RFC 6238)
async function computeTOTP(secret: string, timeStep: number): Promise<string> {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = "";
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }

  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, timeStep, false);

  const key = await globalThis.crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, timeBuffer);
  const hash = new Uint8Array(signature);
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}
