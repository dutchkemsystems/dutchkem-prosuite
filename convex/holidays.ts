import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/**
 * SEED 2026 HOLIDAYS
 */
export const seedHolidays = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const holidays = [
      { name: "New Year", code: "NY25", percent: 25, banner_icon: "🎉", banner_text: "🎉 New Year Special! 25% OFF with code: NY25", start: "2026-01-01", end: "2026-01-01", type: "holiday" },
      { name: "Workers' Day", code: "WORKERS25", percent: 25, banner_icon: "👷", banner_text: "👷 Happy Workers' Day! 25% OFF with code: WORKERS25", start: "2026-05-01", end: "2026-05-01", type: "holiday" },
      { name: "Independence Day", code: "NIGERIA25", percent: 25, banner_icon: "🇳🇬", banner_text: "🇳🇬 Independence Day! 25% OFF with code: NIGERIA25", start: "2026-10-01", end: "2026-10-01", type: "holiday" },
      { name: "Christmas", code: "XMAS25", percent: 25, banner_icon: "🎄", banner_text: "🎄 Merry Christmas! 25% OFF with code: XMAS25", start: "2026-12-25", end: "2026-12-25", type: "holiday" },
      { name: "Boxing Day", code: "BOXING25", percent: 25, banner_icon: "🎁", banner_text: "🎁 Boxing Day! 25% OFF with code: BOXING25", start: "2026-12-26", end: "2026-12-26", type: "holiday" },
      { name: "Good Friday", code: "EASTER20", percent: 20, banner_icon: "🐣", banner_text: "🐣 Easter Savings! 20% OFF with code: EASTER20", start: "2026-04-03", end: "2026-04-03", type: "holiday" },
      { name: "Easter Monday", code: "EASTER20", percent: 20, banner_icon: "🐣", banner_text: "🐣 Easter Savings! 20% OFF with code: EASTER20", start: "2026-04-06", end: "2026-04-06", type: "holiday" },
      { name: "Democracy Day", code: "DEMOC15", percent: 15, banner_icon: "🇳🇬", banner_text: "🇳🇬 Democracy Day! 15% OFF with code: DEMOC15", start: "2026-06-12", end: "2026-06-12", type: "holiday" },
      { name: "Black Friday", code: "BF35", percent: 35, banner_icon: "🔥", banner_text: "🔥 BLACK FRIDAY! 35% OFF with code: BF35", start: "2026-11-25", end: "2026-11-30", type: "seasonal" },
    ];

    for (const h of holidays) {
      const start_ts = new Date(h.start).getTime();
      const end_ts = new Date(h.end).getTime() + (24 * 60 * 60 * 1000) - 1;

      const existing = await ctx.db.query("holiday_discounts")
        .withIndex("by_name", (q) => q.eq("name", h.name))
        .first();

      if (!existing) {
        await ctx.db.insert("holiday_discounts", {
          name: h.name,
          code: h.code,
          percent: h.percent,
          banner_icon: h.banner_icon,
          banner_text: h.banner_text,
          start_date: start_ts,
          end_date: end_ts,
          is_active: false,
          type: h.type as any,
        });
      }
    }
  }
});

export const refreshActiveDiscounts = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const holidays = await ctx.db.query("holiday_discounts").collect();
    
    let highestDiscount: { percent: number; banner_icon: string; banner_text: string; code: string; type: string; start_date: number; end_date: number } | null = null;

    for (const h of holidays) {
      const active = now >= h.start_date && now <= h.end_date;
      if (h.is_active !== active) {
        await ctx.db.patch("holiday_discounts", h._id, { is_active: active });
      }
      
      if (active) {
        if (!highestDiscount || h.percent > highestDiscount.percent) {
          highestDiscount = h;
        }
      }
    }

    const config = await ctx.db.query("system_config").withIndex("by_key", q => q.eq("key", "ACTIVE_DISCOUNT")).first();
    const discount = highestDiscount as any;
    const value = highestDiscount ? {
      id: discount._id,
      percent: highestDiscount.percent,
      code: highestDiscount.code,
      banner_text: highestDiscount.banner_text,
      banner_icon: highestDiscount.banner_icon,
      ends_at: highestDiscount.end_date,
    } : null;

    if (config) {
      await ctx.db.patch("system_config", config._id, { value, updatedAt: now });
    } else {
      await ctx.db.insert("system_config", { key: "ACTIVE_DISCOUNT", value, updatedAt: now });
    }
  }
});

export const getActiveDiscount = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const config = await ctx.db.query("system_config").withIndex("by_key", q => q.eq("key", "ACTIVE_DISCOUNT")).first();
    return config?.value || null;
  }
});

export const listHolidays = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("holiday_discounts").order("asc").collect();
  }
});
