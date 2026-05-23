import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * SEED 2026 HOLIDAYS
 */
export const seedHolidays = internalMutation({
  args: {},
  handler: async (ctx) => {
    const holidays = [
      { name: "New Year's Day", code: "NY2026", percent: 25, banner_icon: "🎉", banner_text: "Happy 2026! Use code: NY2026 for 25% OFF", start: "2026-01-01", end: "2026-01-01", type: "holiday" },
      { name: "Good Friday", code: "EASTER20", percent: 20, banner_icon: "🐣", banner_text: "Easter Savings! Use code: EASTER20 for 20% OFF", start: "2026-04-03", end: "2026-04-03", type: "holiday" },
      { name: "Easter Monday", code: "EASTER20", percent: 20, banner_icon: "🐣", banner_text: "Easter Savings! Use code: EASTER20 for 20% OFF", start: "2026-04-06", end: "2026-04-06", type: "holiday" },
      { name: "Workers' Day", code: "WORKERS15", percent: 15, banner_icon: "👷", banner_text: "Happy Workers' Day! Use code: WORKERS15 for 15% OFF", start: "2026-05-01", end: "2026-05-01", type: "holiday" },
      { name: "Democracy Day", code: "DEMOCRACY15", percent: 15, banner_icon: "🇳🇬", banner_text: "Democracy Day Special! Use code: DEMOCRACY15 for 15% OFF", start: "2026-06-12", end: "2026-06-12", type: "holiday" },
      { name: "Independence Day", code: "NIGERIA25", percent: 25, banner_icon: "🇳🇬", banner_text: "Proudly Nigerian! Use code: NIGERIA25 for 25% OFF", start: "2026-10-01", end: "2026-10-01", type: "holiday" },
      { name: "Christmas Day", code: "MERRY25", percent: 30, banner_icon: "🎄", banner_text: "Christmas Special! Use code: MERRY25 for 30% OFF", start: "2026-12-25", end: "2026-12-25", type: "holiday" },
      { name: "Boxing Day", code: "BOXING25", percent: 25, banner_icon: "🎁", banner_text: "Boxing Day! Use code: BOXING25 for 25% OFF", start: "2026-12-26", end: "2026-12-26", type: "holiday" },
      { name: "New Year's Eve", code: "NY2026", percent: 20, banner_icon: "🎉", banner_text: "Happy 2026! Use code: NY2026 for 20% OFF", start: "2026-12-31", end: "2026-12-31", type: "holiday" },
      { name: "Black Friday", code: "BF35", percent: 35, banner_icon: "🔥", banner_text: "BLACK FRIDAY! Use code: BF35 for 35% OFF", start: "2026-11-25", end: "2026-11-30", type: "seasonal" },
    ];

    for (const h of holidays) {
      const start_ts = new Date(h.start).getTime();
      const end_ts = new Date(h.end).getTime() + (24 * 60 * 60 * 1000) - 1;

      const existing = await ctx.db.query("holiday_discounts")
        .filter(q => q.eq(q.field("name"), h.name))
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
  handler: async (ctx) => {
    const now = Date.now();
    const holidays = await ctx.db.query("holiday_discounts").collect();
    
    let highestDiscount: any = null;

    for (const h of holidays) {
      const active = now >= h.start_date && now <= h.end_date;
      if (h.is_active !== active) {
        await ctx.db.patch(h._id, { is_active: active });
      }
      
      if (active) {
        if (!highestDiscount || h.percent > highestDiscount.percent) {
          highestDiscount = h;
        }
      }
    }

    const config = await ctx.db.query("system_config").withIndex("by_key", q => q.eq("key", "ACTIVE_DISCOUNT")).first();
    const value = highestDiscount ? {
      id: highestDiscount._id,
      percent: highestDiscount.percent,
      code: highestDiscount.code,
      banner_text: highestDiscount.banner_text,
      banner_icon: highestDiscount.banner_icon,
      ends_at: highestDiscount.end_date,
    } : null;

    if (config) {
      await ctx.db.patch(config._id, { value, updatedAt: now });
    } else {
      await ctx.db.insert("system_config", { key: "ACTIVE_DISCOUNT", value, updatedAt: now });
    }
  }
});

export const getActiveDiscount = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("system_config").withIndex("by_key", q => q.eq("key", "ACTIVE_DISCOUNT")).first();
    return config?.value || null;
  }
});

export const listHolidays = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("holiday_discounts").order("asc").collect();
  }
});
