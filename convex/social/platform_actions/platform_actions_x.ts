import { v } from "convex/values";
import { action } from "../../_generated/server";

export const twitterUploadMedia = action({
  args: { accessToken: v.string(), mediaData: v.string(), mediaType: v.optional(v.string()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}` },
        body: (() => { const fd = new FormData(); fd.append("command", "INIT"); fd.append("total_bytes", String(atob(args.mediaData).length)); fd.append("media_type", args.mediaType || "image/jpeg"); return fd; })(),
      });
      const initData = await initRes.json();
      if (!initRes.ok || !initData.media_id_string) return { success: false, error: initData.errors?.[0]?.message || "Twitter media init failed" };
      const mediaId = initData.media_id_string;
      await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}` },
        body: (() => { const fd = new FormData(); fd.append("command", "APPEND"); fd.append("media_id", mediaId); fd.append("segment_index", "0"); fd.append("media_data", args.mediaData); return fd; })(),
      });
      const finalizeRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}` },
        body: (() => { const fd = new FormData(); fd.append("command", "FINALIZE"); fd.append("media_id", mediaId); return fd; })(),
      });
      const finalizeData = await finalizeRes.json();
      return finalizeRes.ok ? { success: true, mediaId } : { success: false, error: "Twitter media finalize failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const twitterGetUserInfo = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url,public_metrics,description,created_at", {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      });
      const data = await res.json();
      return res.ok ? { success: true, user: data.data } : { success: false, error: data.detail || "Failed to get user info" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const twitterLikeTweet = action({
  args: { accessToken: v.string(), userId: v.string(), tweetId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(`https://api.twitter.com/2/users/${args.userId}/likes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tweet_id: args.tweetId }),
      });
      const data = await res.json();
      return res.ok ? { success: true } : { success: false, error: data.detail || "Like failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const twitterReplyToTweet = action({
  args: { accessToken: v.string(), tweetId: v.string(), text: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: args.text, reply: { in_reply_to_tweet_id: args.tweetId } }),
      });
      const data = await res.json();
      return res.ok ? { success: true, postId: data.data?.id } : { success: false, error: data.detail || "Reply failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const twitterSearchTweets = action({
  args: { accessToken: v.string(), query: v.string(), maxResults: v.optional(v.number()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(args.query)}&max_results=${args.maxResults || 10}&tweet.fields=created_at,public_metrics,author_id`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok ? { success: true, tweets: data.data || [] } : { success: false, error: data.detail || "Search failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});
