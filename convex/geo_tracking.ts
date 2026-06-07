import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Feature 9: Geo-Tracking & Territory Management

export const updateClientLocation = mutation({
  args: {
    userId: v.id("users"),
    ip: v.optional(v.string()),
    country: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("client_locations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch("client_locations", existing._id, {
        ip: args.ip ?? existing.ip,
        country: args.country ?? existing.country,
        countryCode: args.countryCode ?? existing.countryCode,
        city: args.city ?? existing.city,
        region: args.region ?? existing.region,
        latitude: args.latitude ?? existing.latitude,
        longitude: args.longitude ?? existing.longitude,
        timezone: args.timezone ?? existing.timezone,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("client_locations", {
        userId: args.userId,
        ip: args.ip,
        country: args.country,
        countryCode: args.countryCode,
        city: args.city,
        region: args.region,
        latitude: args.latitude,
        longitude: args.longitude,
        timezone: args.timezone,
        lastUpdated: Date.now(),
      });
    }
    return null;
  },
});

export const getClientLocation = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("client_locations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getAllClientLocations = query({
  args: {},
  returns: v.array(v.object({
    userId: v.id("users"),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    country: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    city: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  })),
  handler: async (ctx, _args) => {
    const locations = await ctx.db.query("client_locations").collect();
    const result = [];

    for (const loc of locations) {
      const user = await ctx.db.get("users", loc.userId);
      result.push({
        userId: loc.userId,
        userName: user?.name ?? undefined,
        userEmail: user?.email ?? undefined,
        country: loc.country,
        countryCode: loc.countryCode,
        city: loc.city,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    }

    return result;
  },
});

export const getLocationStats = query({
  args: {},
  returns: v.object({
    totalTracked: v.number(),
    byCountry: v.record(v.string(), v.number()),
    byCity: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, _args) => {
    const locations = await ctx.db.query("client_locations").collect();

    const byCountry: Record<string, number> = {};
    const byCity: Record<string, number> = {};

    for (const loc of locations) {
      if (loc.country) {
        byCountry[loc.country] = (byCountry[loc.country] || 0) + 1;
      }
      if (loc.city) {
        byCity[loc.city] = (byCity[loc.city] || 0) + 1;
      }
    }

    return {
      totalTracked: locations.length,
      byCountry,
      byCity,
    };
  },
});

// Territory management
export const createTerritory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    boundaries: v.array(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    color: v.string(),
    assignedAgents: v.array(v.id("users")),
    createdBy: v.id("users"),
  },
  returns: v.id("territories"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("territories", {
      name: args.name,
      description: args.description,
      boundaries: args.boundaries,
      color: args.color,
      assignedAgents: args.assignedAgents,
      isActive: true,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateTerritory = mutation({
  args: {
    territoryId: v.id("territories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    boundaries: v.optional(v.array(v.object({
      lat: v.number(),
      lng: v.number(),
    }))),
    color: v.optional(v.string()),
    assignedAgents: v.optional(v.array(v.id("users"))),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { territoryId, ...updates } = args;
    await ctx.db.patch("territories", territoryId, { ...updates, updatedAt: Date.now() });
    return null;
  },
});

export const getTerritories = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("territories"),
    name: v.string(),
    description: v.optional(v.string()),
    boundaries: v.any(),
    color: v.string(),
    assignedAgents: v.array(v.id("users")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, _args) => {
    return await ctx.db.query("territories").collect();
  },
});

export const deleteTerritory = mutation({
  args: { territoryId: v.id("territories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("territories", args.territoryId);
    return null;
  },
});

// Find which territory a location falls in
export const findTerritoryForLocation = query({
  args: { latitude: v.number(), longitude: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const territories = await ctx.db.query("territories").collect();

    for (const territory of territories) {
      if (territory.boundaries.length < 3) continue;

      // Simple point-in-polygon check (ray casting)
      if (isPointInPolygon(args.latitude, args.longitude, territory.boundaries)) {
        return {
          _id: territory._id,
          name: territory.name,
          color: territory.color,
          assignedAgents: territory.assignedAgents,
        };
      }
    }
    return undefined;
  },
});

// Helper function for point-in-polygon
function isPointInPolygon(lat: number, lng: number, polygon: Array<{lat: number; lng: number}>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const yDiff = yj - yi;

    if (yDiff === 0) continue;

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / yDiff + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const BLOCKED_COUNTRIES = [
  "SA", "AE", "EG", "QA", "KW", "OM", "BH", "JO", "LB", "IQ",
  "YE", "SY", "PS", "LY", "TN", "DZ", "MA", "SD", "SO", "DJ", "MR", "KM",
];

export const isCountryBlocked = query({
  args: { countryCode: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => BLOCKED_COUNTRIES.includes(args.countryCode),
});

export const logGeoBlock = mutation({
  args: { ip: v.string(), country: v.string(), path: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("security_logs", {
      type: "geo-block", ip: args.ip, details: `Blocked access from ${args.country}`,
      path: args.path, severity: "medium", resolved: false, createdAt: Date.now(),
    });
  },
});

export const getGeoStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const logs = await ctx.db.query("security_logs").withIndex("by_type", (q) => q.eq("type", "geo-block")).order("desc").take(500);
    const byCountry: Record<string, number> = {};
    for (const log of logs) {
      const match = log.details.match(/from (.+)/);
      if (match) byCountry[match[1]] = (byCountry[match[1]] ?? 0) + 1;
    }
    return { totalBlocked: logs.length, byCountry };
  },
});
