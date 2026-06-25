import { v } from "convex/values";
import { action, query, mutation, internalMutation, internalQuery } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// APPOINTMENT BOOKING SYSTEM
// Calendar integration, booking links, reminders
// ═══════════════════════════════════════════════════════════════════

export const createBookingSlot = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    durationMinutes: v.number(),
    maxBookings: v.optional(v.number()),
    location: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const slotId = await ctx.db.insert("appointment_slots", {
      title: args.title,
      description: args.description || "",
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      durationMinutes: args.durationMinutes,
      maxBookings: args.maxBookings || 1,
      currentBookings: 0,
      location: args.location || "Online",
      isActive: true,
      createdAt: Date.now(),
    });

    return {
      success: true,
      slotId,
      bookingLink: `https://dutchkem-prosuite-app.vercel.app/book/${slotId}`,
    };
  },
});

export const bookAppointment = action({
  args: {
    slotId: v.string(),
    clientName: v.string(),
    clientEmail: v.string(),
    clientPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const slot = await ctx.runQuery(internal.appointment_booking.getSlot, {
      slotId: args.slotId,
    });

    if (!slot) return { success: false, error: "Slot not found" };
    if (slot.currentBookings >= slot.maxBookings) {
      return { success: false, error: "Slot fully booked" };
    }

    const bookingId = await ctx.runMutation(internal.appointment_booking.createBooking, {
      slotId: args.slotId,
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      clientPhone: args.clientPhone || "",
      notes: args.notes || "",
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
    });

    // Increment booking count
    await ctx.runMutation(internal.appointment_booking.incrementBookings, {
      slotId: args.slotId,
    });

    return {
      success: true,
      bookingId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      confirmation: `Booking confirmed for ${args.clientName} on ${slot.date} at ${slot.startTime}`,
    };
  },
});

export const getAvailableSlots = query({
  args: {
    date: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let slots;
    if (args.date) {
      slots = await ctx.db.query("appointment_slots").withIndex("by_date", (q) => q.eq("date", args.date)).order("asc").take(50);
      slots = slots.filter((s: any) => s.isActive && s.currentBookings < s.maxBookings);
    } else {
      slots = await ctx.db.query("appointment_slots").withIndex("by_active", (q) => q.eq("isActive", true)).order("asc").take(50);
      slots = slots.filter((s: any) => s.currentBookings < s.maxBookings);
    }
    return slots;
  },
});

export const getBookingsForDate = query({
  args: { date: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointment_bookings")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .order("asc")
      .take(50);
  },
});

export const cancelBooking = mutation({
  args: { bookingId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId as any);
    if (!booking) return { success: false, error: "Booking not found" };

    await ctx.db.patch(args.bookingId as any, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    // Decrement booking count on the slot
    const slot = await ctx.db.get((booking as any).slotId);
    if (slot && (slot as any).currentBookings > 0) {
      await ctx.db.patch((slot as any)._id, {
        currentBookings: (slot as any).currentBookings - 1,
      });
    }

    return { success: true, message: "Booking cancelled" };
  },
});

export const generateBookingPage = action({
  args: {
    businessName: v.string(),
    slotId: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Book Appointment - ${args.businessName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
  .card { background: white; border-radius: 12px; padding: 40px; max-width: 480px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  h1 { color: #FF6B35; font-size: 22px; margin-bottom: 5px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 25px; }
  .detail { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .detail .icon { width: 32px; height: 32px; background: #FFF3ED; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .detail .label { color: #999; font-size: 11px; text-transform: uppercase; }
  .detail .value { font-weight: 600; }
  .form { margin-top: 25px; }
  .form input, .form textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; font-size: 14px; font-family: inherit; }
  .form input:focus, .form textarea:focus { outline: none; border-color: #FF6B35; }
  .form textarea { height: 80px; resize: vertical; }
  .btn { width: 100%; padding: 14px; background: #FF6B35; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
  .btn:hover { background: #E85A2A; }
  .footer { text-align: center; margin-top: 15px; font-size: 11px; color: #999; }
</style>
</head>
<body>
<div class="card">
  <h1>${args.businessName}</h1>
  <p class="subtitle">Book your appointment</p>
  <div class="detail"><div class="icon">📅</div><div><div class="label">Date</div><div class="value">${args.date}</div></div></div>
  <div class="detail"><div class="icon">🕐</div><div><div class="label">Time</div><div class="value">${args.startTime} - ${args.endTime}</div></div></div>
  <div class="detail"><div class="icon">📍</div><div><div class="label">Location</div><div class="value">${args.location || "Online"}</div></div></div>
  <div class="form">
    <input type="text" placeholder="Your Name" id="name" required>
    <input type="email" placeholder="Email Address" id="email" required>
    <input type="tel" placeholder="Phone Number" id="phone">
    <textarea placeholder="Notes (optional)" id="notes"></textarea>
    <button class="btn" onclick="submit()">Confirm Booking</button>
  </div>
  <p class="footer">Powered by DutchKem Prosuite</p>
</div>
</body>
</html>`;

    return { success: true, html, slotId: args.slotId };
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL
// ═══════════════════════════════════════════════════════════════════

export const getSlot = internalQuery({
  args: { slotId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.slotId as any);
  },
});

export const createBooking = internalMutation({
  args: {
    slotId: v.string(),
    clientName: v.string(),
    clientEmail: v.string(),
    clientPhone: v.string(),
    notes: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    location: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await ctx.db.insert("appointment_bookings", {
      slotId: args.slotId as any,
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      clientPhone: args.clientPhone,
      notes: args.notes,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
      status: "confirmed",
      createdAt: Date.now(),
    });
  },
});

export const incrementBookings = internalMutation({
  args: { slotId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId as any);
    if (slot) {
      await ctx.db.patch(args.slotId as any, {
        currentBookings: ((slot as any).currentBookings || 0) + 1,
      });
    }
  },
});
