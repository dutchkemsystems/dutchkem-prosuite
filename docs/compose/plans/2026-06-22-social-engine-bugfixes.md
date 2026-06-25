# Social Engine Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 critical bugs in the social engine that prevent scheduled posts from executing, auto-posting from working on most platforms, and engagement tracking from functioning.

**Architecture:** Surgical fixes to existing files — no new tables, no new components. Each fix targets a specific bug with minimal blast radius.

**Tech Stack:** Convex (TypeScript), React, Vite

---

## File Map

| File | Changes |
|---|---|
| `convex/schema.ts` | Add optional `adminId` field to `social_posts` table |
| `convex/scheduledPosts.ts` | Fix `getConnectionForPlatformScheduled` to use stored adminId instead of hardcoded "system"; store adminId when scheduling |
| `convex/autoPosting.ts` | Add missing platform implementations (instagram, youtube, tiktok, pinterest, threads, bluesky); fix Discord to use channel ID; add image support for Instagram |
| `convex/social.ts` | Add token refresh cron helper; fetch real follower counts |
| `convex/crons.ts` | Add token refresh cron job |

---

### Task 1: Fix Scheduled Posts adminId Bug

**Covers:** Scheduled posts fail because `getConnectionForPlatformScheduled` hardcodes `adminId: "system"`

**Files:**
- Modify: `convex/schema.ts:452-465` (add `adminId` field)
- Modify: `convex/scheduledPosts.ts:12-36` (store adminId)
- Modify: `convex/scheduledPosts.ts:197-205` (use stored adminId)

- [ ] **Step 1: Add adminId to social_posts schema**

In `convex/schema.ts`, add `adminId` as an optional field to the `social_posts` table definition at line 452:

```typescript
social_posts: defineTable({
    agentId: v.string(),
    adminId: v.optional(v.string()),  // ADD THIS LINE
    platform: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("scheduled"), v.literal("posted"), v.literal("failed")),
    scheduledFor: v.number(),
    postedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    externalId: v.optional(v.string()),
    anonymous: v.optional(v.boolean()),
  }).index("by_status", ["status"])
    .index("by_scheduled", ["scheduledFor"])
    .index("by_status_and_scheduled", ["status", "scheduledFor"])
    .index("by_admin", ["adminId"]),  // ADD THIS LINE
```

- [ ] **Step 2: Store adminId when scheduling a post**

In `convex/scheduledPosts.ts`, modify `schedulePost` (lines 12-37) to accept and store `adminId`:

```typescript
export const schedulePost = mutation({
  args: {
    platform: v.string(),
    content: v.string(),
    scheduledFor: v.number(),
    imageUrl: v.optional(v.string()),
    anonymous: v.optional(v.boolean()),
    adminId: v.optional(v.string()),  // ADD THIS LINE
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (args.scheduledFor <= Date.now()) throw new Error("scheduledFor must be in the future");

    const postId = await ctx.db.insert("social_posts", {
      agentId: identity.subject,
      adminId: args.adminId,  // ADD THIS LINE
      platform: args.platform,
      content: args.content,
      imageUrl: args.imageUrl,
      status: "scheduled",
      scheduledFor: args.scheduledFor,
      anonymous: args.anonymous || false,
    });

    return { postId, status: "scheduled" };
  },
});
```

- [ ] **Step 3: Fix scheduled post processor to use stored adminId**

Replace the `getConnectionForPlatformScheduled` function (lines 197-205) and update `processScheduledPosts` to pass adminId:

```typescript
// Replace getConnectionForPlatformScheduled (lines 197-205):
export const getConnectionForPlatformScheduled = internalQuery({
  args: { platform: v.string(), adminId: v.string() },  // ADD adminId param
  handler: async (ctx, args) => {
    return await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", args.adminId).eq("platformId", args.platform)
      )
      .first();
  },
});
```

Then update `processScheduledPosts` (lines 142-192) to use the stored adminId:

```typescript
// In processScheduledPosts, replace the connection lookup (lines 150-163):
    for (const post of due) {
      // Use stored adminId, fallback to querying all connections for this platform
      let conn: any = null;
      if (post.adminId) {
        conn = await ctx.runQuery(internal.scheduledPosts.getConnectionForPlatformScheduled, {
          platform: post.platform,
          adminId: post.adminId,
        });
      } else {
        // Fallback: find any connected platform for this platform type
        conn = await ctx.runQuery(internal.scheduledPosts.getAnyConnectionForPlatform, {
          platform: post.platform,
        });
      }

      if (!conn || !conn.isConnected || !conn.accessToken) {
        await ctx.runMutation(internal.scheduledPosts.markScheduledPostResult, {
          postId: post._id,
          success: false,
          error: `Platform ${post.platform} not connected`,
        });
        results.push({ postId: post._id, platform: post.platform, success: false, error: "not connected" });
        continue;
      }
```

- [ ] **Step 4: Add fallback query for any connection**

Add this new query after `getConnectionForPlatformScheduled`:

```typescript
// Fallback: find any connected admin for a platform (for posts without adminId)
export const getAnyConnectionForPlatform = internalQuery({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("platform_connections")
      .withIndex("by_admin", (q) => q.eq("adminId", "system"))
      .filter((q) => q.eq(q.field("platformId"), args.platform))
      .first();
  },
});
```

- [ ] **Step 5: Update admin dashboard to pass adminId when scheduling**

In `src/routes/admin/dashboard.tsx`, find where `schedulePost` is called and ensure `adminId` is passed. Search for `schedulePost` in the file and add the adminId argument.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/scheduledPosts.ts src/routes/admin/dashboard.tsx
git commit -m "fix: scheduled posts use stored adminId instead of hardcoded system"
```

---

### Task 2: Add Missing Platform Implementations to AutoPosting

**Covers:** autoPosting.ts only implements 6 of 12 platforms

**Files:**
- Modify: `convex/autoPosting.ts:145-218` (add instagram, youtube, tiktok, pinterest, threads, bluesky cases)

- [ ] **Step 1: Add Instagram posting (requires image)**

Add this case to the switch statement in `postToOnePlatform` (after the facebook case, around line 188):

```typescript
        case "instagram":
          // Instagram requires an image URL
          res = await fetch(`https://graph.facebook.com/v19.0/me/media?image_url=${encodeURIComponent(content)}&access_token=${accessToken}`, { method: "POST" });
          data = await res.json();
          if (!data.id) return { success: false, error: data.error?.message || "Instagram media creation failed" };
          const containerId = data.id;
          res = await fetch(`https://graph.facebook.com/v19.0/me/media_publish?creation_id=${containerId}&access_token=${accessToken}`, { method: "POST" });
          data = await res.json();
          return res.ok ? { success: true, postId: data.id } : { success: false, error: data.error?.message || "Instagram publish failed" };
```

- [ ] **Step 2: Add YouTube posting**

```typescript
        case "youtube":
          res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=id&mine=true", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const channelData = await res.json();
          if (!channelData.items?.[0]?.id) return { success: false, error: "YouTube channel not found" };
          // YouTube requires video upload — text-only posts not supported via API
          return { success: false, error: "YouTube posting requires video content. Use the video production agent." };
```

- [ ] **Step 3: Add TikTok posting**

```typescript
        case "tiktok":
          res = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ post_info: { title: content.substring(0, 150), privacy_level: "PUBLIC_TO_EVERYONE" }, source_info: { source: "FILE_UPLOAD" } }),
          });
          data = await res.json();
          return data.data?.upload_url ? { success: true, postId: data.data?.publish_id || "tiktok_init" } : { success: false, error: data.meta?.error_message || "TikTok init failed" };
```

- [ ] **Step 4: Add Pinterest posting**

```typescript
        case "pinterest":
          res = await fetch("https://api.pinterest.com/v5/pins", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ title: content.substring(0, 100), description: content, board_id: "me", link: "" }),
          });
          data = await res.json();
          return res.ok ? { success: true, postId: data.id } : { success: false, error: data.message || "Pinterest post failed" };
```

- [ ] **Step 5: Add Threads posting**

```typescript
        case "threads":
          res = await fetch("https://graph.threads.net/v1.0/me/threads", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ media_type: "TEXT", text: content }),
          });
          data = await res.json();
          if (!data.id) return { success: false, error: data.error?.message || "Threads container failed" };
          res = await fetch(`https://graph.threads.net/v1.0/${data.id}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          data = await res.json();
          return data.id ? { success: true, postId: data.id } : { success: false, error: data.error?.message || "Threads publish failed" };
```

- [ ] **Step 6: Add Bluesky posting**

```typescript
        case "bluesky":
          // Bluesky uses AT Protocol — accessToken is actually "identifier:appPassword"
          const [identifier, appPassword] = accessToken.split(":");
          if (!identifier || !appPassword) return { success: false, error: "Bluesky requires identifier:appPassword format" };
          res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password: appPassword }),
          });
          data = await res.json();
          if (!data.accessJwt) return { success: false, error: "Bluesky auth failed" };
          res = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
            method: "POST",
            headers: { Authorization: `Bearer ${data.accessJwt}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              repo: data.did,
              collection: "app.bsky.feed.post",
              record: { text: content, createdAt: new Date().toISOString(), $type: "app.bsky.feed.post" },
            }),
          });
          data = await res.json();
          return data.uri ? { success: true, postId: data.uri } : { success: false, error: data.error || "Bluesky post failed" };
```

- [ ] **Step 7: Commit**

```bash
git add convex/autoPosting.ts
git commit -m "feat: add posting support for instagram, youtube, tiktok, pinterest, threads, bluesky"
```

---

### Task 3: Fix Discord Channel Targeting

**Covers:** Discord posts to self (DM to bot) instead of a channel

**Files:**
- Modify: `convex/autoPosting.ts:196-202`

- [ ] **Step 1: Fix Discord to use channel ID from connection metadata**

Replace the Discord case (lines 196-202):

```typescript
        case "discord":
          // Discord needs a channel ID — stored in platformUserId during connection
          // Fallback to webhooks if available
          const discordChannelId = args.channelId || "general";
          res = await fetch(`https://discord.com/api/v10/channels/${discordChannelId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bot ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          return res.ok ? { success: true, postId: "discord_msg" } : { success: false, error: "Discord post failed" };
```

Note: This requires passing `channelId` through the args chain. The `postToOnePlatform` function signature needs an optional `channelId` arg:

```typescript
export const postToOnePlatform = internalAction({
  args: {
    platform: v.string(),
    accessToken: v.string(),
    content: v.string(),
    channelId: v.optional(v.string()),  // ADD for Discord
  },
```

- [ ] **Step 2: Store Discord channel ID during connection**

In `convex/social.ts`, ensure the Discord connection flow stores the channel ID in `platformUserId` or a dedicated field. Add a `metadata` JSON field to `platform_connections` schema if needed, or use the existing `platformUserId` field.

- [ ] **Step 3: Commit**

```bash
git add convex/autoPosting.ts convex/social.ts
git commit -m "fix: discord posting targets specified channel instead of bot self-DM"
```

---

### Task 4: Add Token Refresh Cron Job

**Covers:** Tokens expire but no cron refreshes them

**Files:**
- Modify: `convex/social.ts` (add refresh action)
- Modify: `convex/crons.ts` (add cron)

- [ ] **Step 1: Add token refresh action to social.ts**

Add this action at the end of `convex/social.ts`:

```typescript
// ═══════════════════════════════════════════════════════════════════
// INTERNAL ACTION: Refresh expired tokens for all connected platforms
// ═══════════════════════════════════════════════════════════════════
export const refreshExpiredTokens = internalAction({
  args: {},
  handler: async (ctx): Promise<{ refreshed: number; failed: number }> => {
    const now = Date.now();
    const threshold = now + 24 * 60 * 60 * 1000; // Refresh tokens expiring within 24h
    const connections = await ctx.db.query("platform_connections")
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    let refreshed = 0;
    let failed = 0;

    for (const conn of connections) {
      if (!conn.expiresAt || conn.expiresAt > threshold) continue; // Not expiring soon
      if (!conn.refreshToken) { failed++; continue; }

      try {
        const config = PLATFORM_CONFIGS[conn.platformId];
        if (!config?.tokenUrl) { failed++; continue; }

        const clientId = getPlatformClientId(conn.platformId);
        const clientSecret = getPlatformClientSecret(conn.platformId);
        if (!clientId || !clientSecret) { failed++; continue; }

        const res = await fetch(config.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: conn.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        });

        if (!res.ok) { failed++; continue; }
        const data = await res.json();
        if (!data.access_token) { failed++; continue; }

        await ctx.db.patch(conn._id, {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || conn.refreshToken,
          expiresAt: data.expires_in ? now + data.expires_in * 1000 : undefined,
          updatedAt: now,
        });
        refreshed++;
      } catch {
        failed++;
      }
    }

    return { refreshed, failed };
  },
});
```

- [ ] **Step 2: Add cron job to crons.ts**

In `convex/crons.ts`, add this cron job (after the existing social-related crons, around line 550):

```typescript
  // Refresh expired social platform tokens every 6 hours
  crons.interval("refresh social platform tokens", { hours: 6 }, internal.social.refreshExpiredTokens),
```

- [ ] **Step 3: Commit**

```bash
git add convex/social.ts convex/crons.ts
git commit -m "feat: add token refresh cron for social platforms (every 6h)"
```

---

### Task 5: Fetch Real Follower Counts

**Covers:** `followersCount` hardcoded to 0

**Files:**
- Modify: `convex/social.ts` (update `getPlatformsFromDb`)

- [ ] **Step 1: Add follower count fetching**

In `convex/social.ts`, find the `getPlatformsFromDb` query (around line 490) and replace the hardcoded `followersCount: 0` with actual API calls:

```typescript
export const getPlatformsFromDb = internalQuery({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.db.query("platform_connections").collect();
    const platforms: Array<any> = [];

    for (const conn of connections) {
      let followersCount = 0;
      // Only fetch if connected and token is valid
      if (conn.isConnected && conn.accessToken && conn.expiresAt && conn.expiresAt > Date.now()) {
        try {
          followersCount = await fetchFollowerCount(conn.platformId, conn.accessToken);
        } catch {
          // Ignore — default to 0
        }
      }

      platforms.push({
        id: conn.platformId,
        name: conn.platformName,
        isConnected: conn.isConnected,
        username: conn.platformUsername,
        autoPostEnabled: conn.autoPostEnabled,
        postsCount: 0,
        followersCount,
        connectedAt: conn.connectedAt,
        integrationId: conn.integrationId,
      });
    }

    return platforms;
  },
});
```

- [ ] **Step 2: Add fetchFollowerCount helper**

Add this helper function in `convex/social.ts` (before `getPlatformsFromDb`):

```typescript
async function fetchFollowerCount(platform: string, accessToken: string): Promise<number> {
  try {
    switch (platform) {
      case "x": {
        const res = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return data.data?.public_metrics?.followers_count || 0;
      }
      case "linkedin": {
        const res = await fetch("https://api.linkedin.com/v2/me?projection=(id,followers)", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return data.followers?.totalFollowers || 0;
      }
      case "facebook":
      case "instagram": {
        const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=followers_count&access_token=${accessToken}`);
        const data = await res.json();
        return data.followers_count || 0;
      }
      case "tiktok": {
        const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return data.data?.user?.follower_count || 0;
      }
      case "youtube": {
        const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        return Number(data.items?.[0]?.statistics?.subscriberCount) || 0;
      }
      default:
        return 0;
    }
  } catch {
    return 0;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add convex/social.ts
git commit -m "feat: fetch real follower counts for connected social platforms"
```

---

### Task 6: Add Instagram Image Support to Auto-Post Templates

**Covers:** Instagram auto-posts always fail because templates are text-only

**Files:**
- Modify: `convex/autoPosting.ts:12-37` (add imageUrl to templates that target instagram)

- [ ] **Step 1: Add imageUrl support to templates**

Update the `TRIGGER_TEMPLATES` to include an optional `imageUrl` for platforms that require it:

```typescript
const TRIGGER_TEMPLATES: Record<string, { template: string; platforms: Array<string>; imageUrl?: string }> = {
  registration: {
    template: "🎉 Welcome {userName} to Dutchkem Pro Suite! They've just unlocked AI-powered agents for business, finance, content, and more. #NewUser #AI",
    platforms: ["x", "linkedin", "facebook"],
    imageUrl: "https://dutchkem-prosuite-app.vercel.app/social/welcome-banner.png",
  },
  project_completed: {
    template: "✅ New success story: {userName} just completed a project with the {agentName} agent. Output delivered, client happy. #Success #AIAgents",
    platforms: ["x", "linkedin"],
  },
  referral_milestone: {
    template: "🏆 {userName} just hit a referral milestone with Dutchkem Pro Suite! Earn rewards for sharing the AI revolution. #ReferralWin",
    platforms: ["x", "facebook"],
  },
  weekly_report: {
    template: "📊 Dutchkem Pro Suite Weekly: {activeUsers} active users, {postsCreated} projects completed, {revenue} revenue generated. The AI economy is here. #WeeklyUpdate",
    platforms: ["x", "linkedin", "facebook"],
  },
  flash_sale: {
    template: "🔥 FLASH SALE LIVE: {saleName} — limited time only. Don't miss out on premium AI agents at unbeatable prices. #FlashSale #LimitedTime",
    platforms: ["x", "linkedin", "facebook", "instagram", "tiktok"],
    imageUrl: "https://dutchkem-prosuite-app.vercel.app/social/flash-sale-banner.png",
  },
  payment_completed: {
    template: "💳 New subscription: {userName} just upgraded to {planName}. Welcome to the next level of AI productivity. #NewSubscriber",
    platforms: ["x", "linkedin"],
  },
};
```

- [ ] **Step 2: Pass imageUrl through the auto-post flow**

Update `buildPost` to return imageUrl:

```typescript
function buildPost(trigger: string, vars: Record<string, string>): { content: string; platforms: Array<string>; imageUrl?: string } | null {
  const tpl = TRIGGER_TEMPLATES[trigger];
  if (!tpl) return null;
  let content = tpl.template;
  for (const [key, val] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{${key}\\}`, "g"), val);
  }
  return { content, platforms: tpl.platforms, imageUrl: tpl.imageUrl };
}
```

Update `fireAutoPost` to pass imageUrl to `postToOnePlatform`:

```typescript
const result: any = await ctx.runAction(internal.autoPosting.postToOnePlatform, {
  platform: conn.platformId,
  accessToken: conn.accessToken,
  content: post.content,
  imageUrl: post.imageUrl,  // ADD THIS
});
```

- [ ] **Step 3: Commit**

```bash
git add convex/autoPosting.ts
git commit -m "fix: add image URL support to auto-post templates for instagram"
```

---

### Task 7: Run Tests and Verify

**Covers:** All fixes verified

- [ ] **Step 1: Run existing tests**

```bash
npx vitest run convex/social.test.ts convex/autoPosting.test.ts
```

Expected: All existing tests pass (they test auth and query shapes, not posting logic).

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "chore: verify all social engine bugfixes pass tests and typecheck"
```
