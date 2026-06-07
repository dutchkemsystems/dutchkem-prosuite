import { v } from "convex/values";
import { action, internalAction, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

const BLOCKED_COUNTRIES = [
  "SA", "AE", "EG", "QA", "KW", "OM", "BH", "JO", "LB", "IQ",
  "YE", "SY", "PS", "LY", "TN", "DZ", "MA", "SD", "SO", "DJ",
  "MR", "KM",
];

const BLOCKED_NAMES: Record<string, string> = {
  SA: "Saudi Arabia", AE: "UAE", EG: "Egypt", QA: "Qatar", KW: "Kuwait",
  OM: "Oman", BH: "Bahrain", JO: "Jordan", LB: "Lebanon", IQ: "Iraq",
  YE: "Yemen", SY: "Syria", PS: "Palestine", LY: "Libya", TN: "Tunisia",
  DZ: "Algeria", MA: "Morocco", SD: "Sudan", SO: "Somalia", DJ: "Djibouti",
  MR: "Mauritania", KM: "Comoros",
};

export const checkGeoAccess = action({
  args: { ip: v.string() },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    try {
      const res = await fetch(`http://ip-api.com/json/${args.ip}?fields=countryCode,country`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { allowed: true, reason: "Geo lookup failed" };
      const data: any = await res.json();
      const code = data.countryCode;
      if (BLOCKED_COUNTRIES.includes(code)) {
        return { allowed: false, country: BLOCKED_NAMES[code] ?? code, reason: `Access restricted in ${BLOCKED_NAMES[code] ?? code}` };
      }
      return { allowed: true, country: data.country };
    } catch {
      return { allowed: true, reason: "Geo check failed open" };
    }
  },
});

export const logBlockedAccess = internalMutation({
  args: { ip: v.string(), country: v.string(), path: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("security_logs", {
      type: "geo-block", ip: args.ip, details: `Blocked access from ${args.country}`,
      path: args.path, severity: "medium", resolved: false, createdAt: Date.now(),
    });
  },
});

export const getBlockedAccessStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, stats: {} };
    const logs = await ctx.db.query("security_logs").withIndex("by_type", (q) => q.eq("type", "geo-block")).order("desc").take(200);
    const byCountry: Record<string, number> = {};
    for (const log of logs) {
      const match = log.details.match(/from (.+)/);
      if (match) byCountry[match[1]] = (byCountry[match[1]] ?? 0) + 1;
    }
    return { authError: false, totalBlocked: logs.length, byCountry };
  },
});

export const isCountryBlocked = internalAction({
  args: { countryCode: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => BLOCKED_COUNTRIES.includes(args.countryCode),
});
