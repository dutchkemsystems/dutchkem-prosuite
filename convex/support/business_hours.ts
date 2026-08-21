import { v } from "convex/values";
import { query } from "../_generated/server";

// ═══════════════════════════════════════════════════════════════════
// BUSINESS HOURS — Nigerian timezone (WAT = UTC+1)
// ═══════════════════════════════════════════════════════════════════
const BUSINESS_HOURS = {
  start: 8,  // 8 AM WAT
  end: 22,   // 10 PM WAT
  timezone: "Africa/Lagos",
  weekendEnabled: true, // Saturdays enabled
};

export function isWithinBusinessHours(): boolean {
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24; // UTC+1
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat

  // Check if weekend and weekends disabled
  if (!BUSINESS_HOURS.weekendEnabled && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }

  return watHour >= BUSINESS_HOURS.start && watHour < BUSINESS_HOURS.end;
}

export function getBusinessHoursMessage(): string {
  const now = new Date();
  const watHour = (now.getUTCHours() + 1) % 24;
  const dayOfWeek = now.getUTCDay();

  if (!BUSINESS_HOURS.weekendEnabled && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return "We're currently closed for the weekend. Our support team is available Monday-Saturday, 8 AM - 10 PM WAT. Leave a message and we'll respond when we're back!";
  }

  if (watHour < BUSINESS_HOURS.start) {
    return `We open at ${BUSINESS_HOURS.start}:00 AM WAT. Our team will respond shortly!`;
  }

  if (watHour >= BUSINESS_HOURS.end) {
    return `We're closed for the day. Our team resumes at ${BUSINESS_HOURS.start}:00 AM WAT. Leave a message and we'll respond first thing!`;
  }

  return "";
}

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get business hours status
// ═══════════════════════════════════════════════════════════════════
export const getBusinessHoursStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    const withinHours = isWithinBusinessHours();
    const message = getBusinessHoursMessage();
    return {
      withinHours,
      message,
      hours: `${BUSINESS_HOURS.start}:00 - ${BUSINESS_HOURS.end}:00 WAT`,
      timezone: BUSINESS_HOURS.timezone,
      weekendEnabled: BUSINESS_HOURS.weekendEnabled,
    };
  },
});
