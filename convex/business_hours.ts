import { v } from "convex/values";
import { action, query, mutation, internalQuery } from "./_generated/server";
import { api } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// BUSINESS HOURS & AUTO-REPLY
// Configure business hours, auto-reply outside hours, timezone support
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_SCHEDULE = {
  monday:    { open: "08:00", close: "18:00", enabled: true },
  tuesday:   { open: "08:00", close: "18:00", enabled: true },
  wednesday: { open: "08:00", close: "18:00", enabled: true },
  thursday:  { open: "08:00", close: "18:00", enabled: true },
  friday:    { open: "08:00", close: "18:00", enabled: true },
  saturday:  { open: "09:00", close: "14:00", enabled: true },
  sunday:    { open: "00:00", close: "00:00", enabled: false },
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// ═══════════════════════════════════════════════════════════════════
// CHECK IF BUSINESS IS OPEN
// ═══════════════════════════════════════════════════════════════════

export const checkBusinessHours = action({
  args: {
    timezone: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const tz = args.timezone || "Africa/Lagos";
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const dayName = DAY_NAMES[localTime.getDay()];
    const hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    const currentTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    // Get schedule from DB or use default
    let schedule: any = DEFAULT_SCHEDULE;
    try {
      const dbSchedule = await ctx.runQuery(api.business_hours.getScheduleInternal);
      if (dbSchedule) schedule = dbSchedule.schedule;
    } catch {}

    const todaySchedule = schedule[dayName] || { enabled: false };
    const isOpen = todaySchedule.enabled && currentTime >= todaySchedule.open && currentTime <= todaySchedule.close;

    // Find next opening time
    let nextOpen = "";
    let nextOpenDay = "";
    if (!isOpen) {
      for (let offset = 1; offset <= 7; offset++) {
        const checkDay = DAY_NAMES[(localTime.getDay() + offset) % 7];
        const daySchedule = schedule[checkDay];
        if (daySchedule && daySchedule.enabled) {
          nextOpen = daySchedule.open;
          nextOpenDay = checkDay;
          break;
        }
      }
    }

    // Calculate time remaining if open
    let minutesUntilClose = 0;
    if (isOpen) {
      const [closeH, closeM] = todaySchedule.close.split(":").map(Number);
      minutesUntilClose = (closeH - hours) * 60 + (closeM - minutes);
    }

    return {
      isOpen,
      timezone: tz,
      currentTime,
      currentDay: dayName,
      todaySchedule: {
        open: todaySchedule.open || "Closed",
        close: todaySchedule.close || "Closed",
        enabled: todaySchedule.enabled,
      },
      minutesUntilClose: isOpen ? minutesUntilClose : 0,
      nextOpen: isOpen ? "" : nextOpen,
      nextOpenDay: isOpen ? "" : nextOpenDay,
      message: isOpen
        ? `We're open! Today: ${todaySchedule.open} - ${todaySchedule.close}. ${minutesUntilClose} minutes remaining.`
        : `We're currently closed. Next opening: ${nextOpenDay.charAt(0).toUpperCase() + nextOpenDay.slice(1)} at ${nextOpen}.`,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE AUTO-REPLY MESSAGE
// ═══════════════════════════════════════════════════════════════════

export const getAutoReply = action({
  args: {
    businessName: v.string(),
    timezone: v.optional(v.string()),
    customMessage: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const hoursResult = await ctx.runAction(api.business_hours.checkBusinessHours, {
      timezone: args.timezone,
    });

    if (hoursResult.isOpen) {
      return {
        isOpen: true,
        reply: null,
        message: `${args.businessName} is currently open. How can we help you?`,
      };
    }

    const customReply = args.customMessage || "";
    const autoReply = customReply
      ? `${customReply}\n\n${hoursResult.message}`
      : `Thank you for reaching out to ${args.businessName}!\n\nWe're currently outside business hours.\n\n${hoursResult.message}\n\nWe'll get back to you as soon as we're open.\n\nIn the meantime, you can:\n- Visit our website: https://dutchkem-prosuite-app.vercel.app\n- Leave a message and we'll respond promptly\n\nHave a great day!`;

    return {
      isOpen: false,
      reply: autoReply,
      nextOpen: hoursResult.nextOpen,
      nextOpenDay: hoursResult.nextOpenDay,
      timezone: hoursResult.timezone,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// CONFIGURE BUSINESS HOURS
// ═══════════════════════════════════════════════════════════════════

export const setSchedule = mutation({
  args: {
    schedule: v.any(),
    timezone: v.optional(v.string()),
    closedMessage: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Upsert schedule
    const existing = await ctx.db.query("business_hours").first();

    const scheduleData = {
      schedule: args.schedule || DEFAULT_SCHEDULE,
      timezone: args.timezone || "Africa/Lagos",
      closedMessage: args.closedMessage || "",
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, scheduleData);
    } else {
      await ctx.db.insert("business_hours", {
        ...scheduleData,
        createdAt: Date.now(),
      });
    }

    return { success: true, message: "Business hours updated" };
  },
});

export const getSchedule = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const schedule = await ctx.db.query("business_hours").first();
    return schedule || { schedule: DEFAULT_SCHEDULE, timezone: "Africa/Lagos" };
  },
});

export const getScheduleInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("business_hours").first();
  },
});

// ═══════════════════════════════════════════════════════════════════
// GENERATE BUSINESS HOURS PAGE
// ═══════════════════════════════════════════════════════════════════

export const generateHoursPage = action({
  args: {
    businessName: v.string(),
    timezone: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const statusResult = await ctx.runAction(api.business_hours.checkBusinessHours, {
      timezone: args.timezone,
    });

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    const dayRows = days.map(d => {
      const isToday = d === statusResult.currentDay;
      return `<tr${isToday ? ' style="background:#FFF3ED;font-weight:700;"' : ""}>
        <td>${d.charAt(0).toUpperCase() + d.slice(1)}${isToday ? " (Today)" : ""}</td>
        <td>${statusResult.isOpen && isToday ? "Open" : ""}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Business Hours - ${args.businessName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
  .card { background: white; border-radius: 16px; padding: 40px; max-width: 500px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; }
  h1 { color: #FF6B35; font-size: 24px; margin-bottom: 5px; }
  .status-badge { display: inline-block; padding: 6px 18px; border-radius: 20px; font-size: 12px; font-weight: 700; margin: 15px 0; letter-spacing: 0.5px; }
  .open { background: #d4edda; color: #155724; }
  .closed { background: #f8d7da; color: #721c24; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { padding: 12px 15px; text-align: left; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
  th { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
  .message { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; line-height: 1.5; }
  .footer { margin-top: 25px; font-size: 11px; color: #999; }
  .footer a { color: #FF6B35; }
</style>
</head>
<body>
<div class="card">
  <h1>${args.businessName}</h1>
  <div class="status-badge ${statusResult.isOpen ? 'open' : 'closed'}">
    ${statusResult.isOpen ? '● OPEN NOW' : '● CLOSED'}
  </div>
  <div class="message">${statusResult.message}</div>
  <table>
    <thead><tr><th>Day</th><th>Hours</th></tr></thead>
    <tbody>${dayRows}</tbody>
  </table>
  <p class="footer">Powered by <a href="https://dutchkem-prosuite-app.vercel.app/auth">DutchKem Prosuite</a></p>
</div>
</body>
</html>`;

    return { success: true, html, isOpen: statusResult.isOpen, message: statusResult.message };
  },
});
