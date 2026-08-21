import { v } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { tryGetAdminSessionInAction } from "../../auth_helpers";

export const connectTelegramBot = action({
  args: {
    botToken: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; username?: string; botId?: number; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      if (!args.botToken || !args.botToken.includes(":")) {
        return {
          success: false,
          error: "Invalid bot token format. Expected: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
        };
      }

      const res = await fetch(`https://api.telegram.org/bot${args.botToken}/getMe`);
      if (!res.ok) return { success: false, error: "Invalid bot token — Telegram rejected the token" };

      const data: any = await res.json();
      if (!data.ok) return { success: false, error: data.description || "Telegram API error" };

      const bot = data.result;
      const username = bot.username ? `@${bot.username}` : "Telegram Bot";

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity._id, platform: "telegram", platformName: "Telegram",
        accessToken: args.botToken, refreshToken: "", platformUserId: String(bot.id || ""),
        platformUsername: username, scopes: "", anonymousByDefault: false,
        integrationId: "telegram_bot",
      });

      return { success: true, username, botId: bot.id };
    } catch (err: any) {
      return { success: false, error: `Telegram connection failed: ${err?.message || String(err)}` };
    }
  },
});

export const connectBluesky = action({
  args: {
    identifier: v.string(),
    appPassword: v.string(),
    adminToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean; handle?: string; did?: string; error?: string;
  }> => {
    try {
      const identity = await tryGetAdminSessionInAction(ctx, args.adminToken);
      if (!identity) return { success: false, error: "Not authenticated" };

      if (!args.identifier || !args.appPassword) {
        return { success: false, error: "Identifier and app password are required" };
      }

      const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: args.identifier, password: args.appPassword }),
      });

      if (!res.ok) {
        const err: any = await res.json().catch(() => ({}));
        return {
          success: false,
          error: err.message || "Bluesky login failed — check your handle and app password",
        };
      }

      const data: any = await res.json();
      const handle = data.handle || args.identifier;
      const did = data.did || "";

      await ctx.runMutation(internal.social.savePlatformConnection, {
        adminId: identity._id, platform: "bluesky", platformName: "Bluesky",
        accessToken: data.accessJwt || "", refreshToken: data.refreshJwt || "",
        platformUserId: did, platformUsername: handle, scopes: "atproto",
        anonymousByDefault: true, integrationId: "atproto",
      });

      return { success: true, handle, did };
    } catch (err: any) {
      return { success: false, error: `Bluesky connection failed: ${err?.message || String(err)}` };
    }
  },
});
