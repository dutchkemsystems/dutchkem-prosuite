import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// OPENOSINT — AI-powered intelligence capabilities
// Email, username, breach, domain, IP investigation
// ═══════════════════════════════════════════════════════════════════

const OSINT_TOOLS = [
  { id: "email", name: "Email Lookup", description: "Find info about email addresses", icon: "📧" },
  { id: "username", name: "Username Search", description: "Search usernames across platforms", icon: "👤" },
  { id: "domain", name: "Domain Intel", description: "Domain WHOIS and DNS info", icon: "🌐" },
  { id: "ip", name: "IP Lookup", description: "IP address geolocation and info", icon: "📍" },
  { id: "phone", name: "Phone Lookup", description: "Phone number validation", icon: "📱" },
  { id: "whois", name: "WHOIS", description: "Domain registration info", icon: "📋" },
  { id: "dns", name: "DNS Lookup", description: "DNS records lookup", icon: "🔍" },
  { id: "breach", name: "Breach Check", description: "Check if email was in breaches", icon: "🔓" },
];

// ─── INVESTIGATE ───

export const investigate = action({
  args: {
    target: v.string(),
    type: v.union(
      v.literal("email"),
      v.literal("username"),
      v.literal("domain"),
      v.literal("ip"),
      v.literal("phone")
    ),
    tools: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const results: Record<string, any> = {};

    const targetTools = args.tools || OSINT_TOOLS.map((t) => t.id);

    for (const tool of targetTools) {
      try {
        results[tool] = await runOsintTool(tool, args.target, args.type);
      } catch (error: any) {
        results[tool] = { error: error.message, success: false };
      }
    }

    // Store investigation
    await ctx.runMutation(internal.open_osint.storeInvestigation, {
      target: args.target,
      type: args.type,
      results,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      target: args.target,
      type: args.type,
      results,
      duration: Date.now() - startTime,
      toolsUsed: Object.keys(results).length,
    };
  },
});

// ─── OSINT TOOLS ───

async function runOsintTool(tool: string, target: string, type: string) {
  switch (tool) {
    case "email":
      return await lookupEmail(target);
    case "username":
      return await searchUsername(target);
    case "domain":
      return await lookupDomain(target);
    case "ip":
      return await lookupIP(target);
    case "phone":
      return await lookupPhone(target);
    case "whois":
      return await lookupWhois(target);
    case "dns":
      return await lookupDNS(target);
    case "breach":
      return await checkBreach(target);
    default:
      return { error: `Unknown tool: ${tool}`, success: false };
  }
}

async function lookupEmail(email: string) {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  const [localPart, domain] = email.split("@");
  return {
    valid: true,
    email,
    domain,
    localPart,
    isDisposable: ["tempmail.com", "throwaway.email", "guerrillamail.com"].includes(domain),
    isCorporate: !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain),
    provider: domain.split(".")[0],
  };
}

async function searchUsername(username: string) {
  // Check username availability across platforms
  const platforms = [
    { name: "Twitter", check: `https://twitter.com/${username}` },
    { name: "GitHub", check: `https://github.com/${username}` },
    { name: "Instagram", check: `https://instagram.com/${username}` },
    { name: "LinkedIn", check: `https://linkedin.com/in/${username}` },
  ];

  const results = [];
  for (const platform of platforms) {
    try {
      const response = await fetch(platform.check, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      results.push({
        platform: platform.name,
        exists: response.status !== 404,
        url: platform.check,
      });
    } catch {
      results.push({ platform: platform.name, exists: false, error: "Check failed" });
    }
  }

  return { username, platforms: results, found: results.filter((r) => r.exists).length };
}

async function lookupDomain(domain: string) {
  try {
    // Use public DNS-over-HTTPS
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await response.json();

    return {
      domain,
      records: data.Answer || [],
      hasDNS: (data.Answer || []).length > 0,
    };
  } catch (error: any) {
    return { domain, error: error.message, hasDNS: false };
  }
}

async function lookupIP(ip: string) {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await response.json();

    return {
      ip,
      country: data.country_name,
      city: data.city,
      region: data.region,
      org: data.org,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error: any) {
    return { ip, error: error.message };
  }
}

async function lookupPhone(phone: string) {
  // Basic phone validation
  const cleaned = phone.replace(/\D/g, "");
  return {
    phone,
    cleaned,
    length: cleaned.length,
    isValid: cleaned.length >= 10 && cleaned.length <= 15,
    countryCode: cleaned.startsWith("234") ? "Nigeria" : "Unknown",
  };
}

async function lookupWhois(domain: string) {
  // WHOIS requires API - return placeholder
  return {
    domain,
    note: "WHOIS lookup requires API key configuration",
    registrar: "Unknown",
    creationDate: "Unknown",
    expirationDate: "Unknown",
  };
}

async function lookupDNS(domain: string) {
  const recordTypes = ["A", "AAAA", "MX", "NS", "TXT", "CNAME"];
  const records: Record<string, any[]> = {};

  for (const type of recordTypes) {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=${type}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const data = await response.json();
      records[type] = data.Answer || [];
    } catch {
      records[type] = [];
    }
  }

  return { domain, records, totalRecords: Object.values(records).flat().length };
}

async function checkBreach(email: string) {
  // Breach check requires API - return placeholder
  return {
    email,
    breached: false,
    note: "Breach check requires HaveIBeenPwned API key",
    breaches: [],
  };
}

// ─── STORE ───

export const storeInvestigation = internalMutation({
  args: {
    target: v.string(),
    type: v.string(),
    results: v.any(),
    duration: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("system_config", {
      key: `osint_investigation_${Date.now()}`,
      value: {
        target: args.target,
        type: args.type,
        results: args.results,
        duration: args.duration,
        timestamp: Date.now(),
      },
      updatedAt: Date.now(),
    });
  },
});

// ─── QUERIES ───

export const getTools = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return OSINT_TOOLS;
  },
});

export const getStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return {
      enabled: true,
      tools: OSINT_TOOLS.length,
      capabilities: ["email_lookup", "username_search", "domain_intel", "ip_lookup", "breach_check"],
    };
  },
});
