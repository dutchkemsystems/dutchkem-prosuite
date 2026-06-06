import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const UPGRADE_CYCLES = [
  { cycle: "SPRING", month: 5, day: 1, label: "Spring Service Update" },
  { cycle: "FALL", month: 11, day: 1, label: "Fall Service Update" },
];

export const runBiAnnualUpgrade = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const flag = await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", "auto_upgrade_enabled"))
      .first();

    if (!flag || !flag.enabled) {
      console.log("[UPGRADE] auto_upgrade_enabled is false — skipping");
      return { applied: false, reason: "auto_upgrade_enabled is false" };
    }

    const date = new Date(now);
    const currentCycle = UPGRADE_CYCLES.find(c => c.month === date.getMonth() + 1 && c.day === date.getDate());

    if (!currentCycle) {
      return { applied: false, reason: "Not a scheduled upgrade date" };
    }

    const existingLog = await ctx.db.query("update_history")
      .withIndex("by_cycle", q => q.eq("cycle", `${currentCycle.cycle}_${date.getFullYear()}`))
      .first();

    if (existingLog && existingLog.status === "applied") {
      return { applied: false, reason: "Upgrade already applied this cycle" };
    }

    try {
      const version = `${currentCycle.cycle.toLowerCase()}-${date.getFullYear()}-v2`;

      await ctx.db.insert("update_history", {
        cycle: `${currentCycle.cycle}_${date.getFullYear()}`,
        version,
        status: "applied",
        snapshot: { appliedAt: now, cycle: currentCycle.label },
        timestamp: now,
      });

      await ctx.db.insert("notifications", {
        userId: undefined,
        title: `🔄 ${currentCycle.label} Applied`,
        message: `The ${currentCycle.label} (${version}) has been automatically applied. System is current.`,
        type: "broadcast",
        read: false,
        createdAt: now,
      });

      console.log(`[UPGRADE] ${currentCycle.label} (${version}) applied successfully`);
      return { applied: true, version, cycle: currentCycle.label };
    } catch (err: any) {
      console.error(`[UPGRADE] Failed:`, err);

      await ctx.db.insert("update_history", {
        cycle: `${currentCycle.cycle}_${date.getFullYear()}`,
        version: "failed",
        status: "failed",
        snapshot: { error: err.message, attemptedAt: now },
        timestamp: now,
      });

      return { applied: false, reason: err.message };
    }
  },
});

export const getUpgradeStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const date = new Date(now);
    const currentMonth = date.getMonth() + 1;
    const currentDay = date.getDate();

    const flag = await ctx.db.query("system_config")
      .withIndex("by_key", q => q.eq("key", "auto_upgrade_enabled"))
      .first();

    const autoUpgradeEnabled = flag?.value === true;

    const lastLog = await ctx.db.query("update_history")
      .order("desc")
      .first();

    const upcoming = UPGRADE_CYCLES.find(c =>
      c.month > currentMonth || (c.month === currentMonth && c.day >= currentDay)
    ) || UPGRADE_CYCLES[0];

    return {
      autoUpgradeEnabled,
      currentStatus: autoUpgradeEnabled ? "System current" : "Updates pending",
      statusIndicator: autoUpgradeEnabled ? "🟢" : "🔴",
      lastUpgrade: lastLog
        ? { cycle: lastLog.cycle, version: lastLog.version, status: lastLog.status, date: new Date(lastLog.timestamp).toISOString() }
        : null,
      nextScheduled: upcoming
        ? `${upcoming.label} (${upcoming.month}/${upcoming.day})`
        : "TBD",
    };
  },
});

export const toggleAutoUpgrade = mutation({
  args: { enabled: v.boolean() },
  returns: v.any(),
  handler: async (ctx, { enabled }) => {
    const existing = await ctx.db.query("feature_flags")
      .withIndex("by_key", q => q.eq("key", "auto_upgrade_enabled"))
      .first();

    if (existing) {
      await ctx.db.patch("feature_flags", existing._id, { enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("feature_flags", {
        key: "auto_upgrade_enabled",
        enabled,
        label: "Auto Upgrade Enabled",
        updatedAt: Date.now(),
      });
    }

    return { enabled };
  },
});
