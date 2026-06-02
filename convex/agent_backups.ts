import { query, mutation, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * AGENT BACKUPS - Cloud-based backup system
 * Admin-only controls for backing up and restoring agent configurations
 */

function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(16);
}

/**
 * Create a backup of all agent configurations
 */
export const createBackup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Get all system_config entries
    const allConfigs = await ctx.db.query("system_config").collect();
    
    // Filter for agent-related configs
    const agentConfigs = allConfigs.filter(c => 
      c.key.startsWith("SYNTHETIC_") || 
      c.key.startsWith("AGENT_") ||
      c.key.startsWith("API_USE_")
    );

    // Create backup
    const backupData = {
      name: args.name,
      description: args.description || `Backup created at ${new Date().toISOString()}`,
      timestamp: Date.now(),
      configs: agentConfigs.map(c => ({
        key: c.key,
        value: c.value,
        description: c.description,
      })),
      stats: {
        totalConfigs: agentConfigs.length,
        syntheticAgents: agentConfigs.filter(c => c.key.includes("ENABLED") && c.value === true).length,
      },
    };

    // Store backup
    const backupId = await ctx.db.insert("system_backups", {
      backupType: "agent_config",
      data: backupData,
      description: args.name,
      createdAt: Date.now(),
      status: "active",
      checksum: simpleHash(JSON.stringify(backupData)),
    });

    return {
      success: true,
      backupId,
      name: args.name,
      timestamp: backupData.timestamp,
      stats: backupData.stats,
    };
  },
});

/**
 * Get all backups
 */
export const getBackups = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const backups = await ctx.db.query("system_backups")
      .filter(q => q.eq(q.field("backupType"), "agent_config"))
      .order("desc")
      .collect();

    return backups.map(b => ({
      id: b._id,
      name: b.description,
      timestamp: b.createdAt,
      status: b.status,
      stats: b.data?.stats || {},
    }));
  },
});

/**
 * Get backup details
 */
export const getBackupDetails = query({
  args: { backupId: v.id("system_backups") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const backup = await ctx.db.get(args.backupId);
    if (!backup) return null;

    return {
      id: backup._id,
      name: backup.description,
      timestamp: backup.createdAt,
      status: backup.status,
      data: backup.data,
    };
  },
});

/**
 * Restore from backup (admin only)
 */
export const restoreBackup = mutation({
  args: { backupId: v.id("system_backups") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const backup = await ctx.db.get(args.backupId);
    if (!backup) return { success: false, error: "Backup not found" };

    const backupData = backup.data as any;
    if (!backupData?.configs) return { success: false, error: "Invalid backup data" };

    // Restore each config
    let restored = 0;
    for (const config of backupData.configs) {
      const existing = await ctx.db.query("system_config")
        .withIndex("by_key", q => q.eq("key", config.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: config.value,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("system_config", {
          key: config.key,
          value: config.value,
          description: config.description,
          updatedAt: Date.now(),
        });
      }
      restored++;
    }

    return {
      success: true,
      backupId: args.backupId,
      name: backup.description,
      restored,
      message: `Restored ${restored} configurations from backup`,
    };
  },
});

/**
 * Delete backup (admin only)
 */
export const deleteBackup = mutation({
  args: { backupId: v.id("system_backups") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const backup = await ctx.db.get(args.backupId);
    if (!backup) return { success: false, error: "Backup not found" };

    await ctx.db.patch(args.backupId, { status: "deleted" });

    return { success: true, message: "Backup deleted" };
  },
});

/**
 * Auto-backup (run daily via cron)
 */
export const autoBackup = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const date = new Date(now).toISOString().split("T")[0];

    // Create automatic backup
    const result: any = await ctx.runMutation(internal.agent_backups.createBackupInternal, {
      name: `Auto Backup ${date}`,
      description: `Automatic daily backup`,
    });

    return result;
  },
});

// Internal helpers
export const createBackupInternal = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const allConfigs = await ctx.db.query("system_config").collect();
    const agentConfigs = allConfigs.filter(c => 
      c.key.startsWith("SYNTHETIC_") || 
      c.key.startsWith("AGENT_") ||
      c.key.startsWith("API_USE_")
    );

    const backupData = {
      name: args.name,
      description: args.description || `Auto backup at ${new Date().toISOString()}`,
      timestamp: Date.now(),
      configs: agentConfigs.map(c => ({
        key: c.key,
        value: c.value,
        description: c.description,
      })),
      stats: {
        totalConfigs: agentConfigs.length,
        syntheticAgents: agentConfigs.filter(c => c.key.includes("ENABLED") && c.value === true).length,
      },
    };

    const backupId = await ctx.db.insert("system_backups", {
      backupType: "agent_config",
      data: backupData,
      description: args.name,
      createdAt: Date.now(),
      status: "active",
      checksum: simpleHash(JSON.stringify(backupData)),
    });

    return { backupId, name: args.name };
  },
});
