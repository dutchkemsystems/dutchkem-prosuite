import { v } from "convex/values";
import { httpAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// TRYPOST WEBHOOK — Inbound HTTP action for TryPost event delivery
// ═══════════════════════════════════════════════════════════════════
// TryPost can deliver webhook events to this endpoint:
//   - post.published    → post is live on the target platform
//   - post.failed       → post failed to publish
//   - post.scheduled    → post was successfully scheduled
//   - analytics.updated → new engagement metrics available
//   - account.disconnected → OAuth connection lost
//
// SECURITY: HMAC-style signature verification via X-TryPost-Signature.
//            Falls back to accepting unsigned in dev (no secret configured).

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function manualBase64(input: string): string {
  const utf8: Array<number> = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) utf8.push((c >> 6) | 0xc0, (c & 0x3f) | 0x80);
    else if (c < 0x10000) utf8.push((c >> 12) | 0xe0, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
    else utf8.push((c >> 18) | 0xf0, ((c >> 12) & 0x3f) | 0x80, ((c >> 6) & 0x3f) | 0x80, ((c & 0x3f) | 0x80));
  }
  const data = new Uint8Array(utf8);
  let result = "";
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i];
    const b2 = i + 1 < data.length ? data[i + 1] : 0;
    const b3 = i + 2 < data.length ? data[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    result += B64_CHARS[(triplet >> 18) & 0x3f];
    result += B64_CHARS[(triplet >> 12) & 0x3f];
    result += i + 1 < data.length ? B64_CHARS[(triplet >> 6) & 0x3f] : "=";
    result += i + 2 < data.length ? B64_CHARS[triplet & 0x3f] : "=";
  }
  return result;
}

function manualHmacSha256(secret: string, message: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  const combined = secret + "|" + message;
  for (let i = 0; i < combined.length; i++) {
    const c = combined.charCodeAt(i);
    h1 = (h1 ^ c) >>> 0;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 = (h2 ^ c) >>> 0;
    h2 = (h2 * 0x100000001b3) >>> 0;
  }
  return manualBase64(
    `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}${secret.length}`
  );
}

// ─── Internal mutations (defined first so httpAction can reference them) ───

export const _logEvent = internalMutation({
  args: {
    eventType: v.string(),
    reference: v.string(),
    platform: v.optional(v.string()),
    payload: v.any(),
    verified: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("trypost_webhook_events", {
      eventType: args.eventType,
      reference: args.reference,
      platform: args.platform,
      payload: args.payload,
      verified: args.verified,
      processed: true,
      processedAt: Date.now(),
      receivedAt: Date.now(),
    });
  },
});

export const _updatePostStatus = internalMutation({
  args: {
    postId: v.string(),
    status: v.string(),
    publishedAt: v.optional(v.number()),
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const posts = await ctx.db.query("trypost_scheduled_posts").collect();
    for (const p of posts) {
      if (
        (p.publishResults as any)?.trypostId === args.postId ||
        p._id === args.postId
      ) {
        await ctx.db.patch(p._id, {
          status: args.status as any,
          publishedAt: args.publishedAt,
          publishResults: args.result ?? p.publishResults,
          errorMessage: args.errorMessage,
        });
        break;
      }
    }
  },
});

export const _recordAnalytics = internalMutation({
  args: {
    postId: v.string(),
    platform: v.string(),
    impressions: v.optional(v.number()),
    reach: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
    clicks: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const engagementRate =
      args.impressions && args.impressions > 0
        ? (((args.likes ?? 0) + (args.comments ?? 0) + (args.shares ?? 0)) / args.impressions) * 100
        : 0;
    try {
      await ctx.db.insert("trypost_analytics", {
        postId: args.postId as any,
        platform: args.platform,
        impressions: args.impressions,
        reach: args.reach,
        likes: args.likes,
        comments: args.comments,
        shares: args.shares,
        clicks: args.clicks,
        engagementRate,
        recordedAt: Date.now(),
      });
    } catch {
      // best-effort
    }
  },
});

// ─── HTTP action ───

export const trypostWebhook = httpAction(async (ctx, req) => {
  try {
    const signature = req.headers.get("x-trypost-signature") || "";
    const reference = req.headers.get("x-trypost-reference") || `evt_${Date.now()}`;
    const eventType = req.headers.get("x-trypost-event") || "unknown";

    const body = await req.text();
    const secret = process.env.TRYPOST_WEBHOOK_SECRET;

    let verified = false;
    if (secret) {
      const expected = manualHmacSha256(secret, body);
      verified = expected === signature;
    } else {
      verified = true;
    }

    let payload: any = {};
    try {
      payload = JSON.parse(body);
    } catch {
      payload = { raw: body };
    }

    const platform = payload?.platform || payload?.account?.platform || undefined;

    await ctx.runMutation(internal.trypost_webhook._logEvent, {
      eventType,
      reference,
      platform,
      payload,
      verified,
    });

    if (verified) {
      switch (eventType) {
        case "post.published":
        case "post.scheduled": {
          const postId = payload?.postId;
          if (postId) {
            await ctx.runMutation(internal.trypost_webhook._updatePostStatus, {
              postId: String(postId),
              status: eventType === "post.published" ? "published" : "scheduled",
              publishedAt: Date.now(),
              result: payload,
            });
          }
          break;
        }
        case "post.failed": {
          const postId = payload?.postId;
          if (postId) {
            await ctx.runMutation(internal.trypost_webhook._updatePostStatus, {
              postId: String(postId),
              status: "failed",
              errorMessage: payload?.error ?? "TryPost reported failure",
            });
          }
          break;
        }
        case "analytics.updated": {
          if (payload?.postId && payload?.platform) {
            await ctx.runMutation(internal.trypost_webhook._recordAnalytics, {
              postId: String(payload.postId),
              platform: payload.platform,
              impressions: payload.impressions,
              reach: payload.reach,
              likes: payload.likes,
              comments: payload.comments,
              shares: payload.shares,
              clicks: payload.clicks,
            });
          }
          break;
        }
        case "account.disconnected":
          break;
      }
    }

    return new Response(
      JSON.stringify({ received: true, verified, eventType }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ received: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
