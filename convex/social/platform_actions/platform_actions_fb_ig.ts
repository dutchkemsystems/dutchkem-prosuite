import { v } from "convex/values";
import { action } from "../../_generated/server";

export const facebookUploadMedia = action({
  args: { accessToken: v.string(), pageId: v.string(), imageUrl: v.string(), message: v.optional(v.string()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.pageId}/photos?url=${encodeURIComponent(args.imageUrl)}&message=${encodeURIComponent(args.message || "")}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const data = await res.json();
      return res.ok ? { success: true, postId: data.id } : { success: false, error: data.error?.message || "Facebook media upload failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const facebookGetComments = action({
  args: { accessToken: v.string(), postId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.postId}/comments?access_token=${args.accessToken}&fields=id,message,from,created_time,like_count`,
        { method: "GET" }
      );
      const data = await res.json();
      return res.ok ? { success: true, comments: data.data || [] } : { success: false, error: data.error?.message || "Failed to get comments" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const facebookReplyToComment = action({
  args: { accessToken: v.string(), commentId: v.string(), message: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.commentId}/comments?message=${encodeURIComponent(args.message)}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const data = await res.json();
      return res.ok ? { success: true, replyId: data.id } : { success: false, error: data.error?.message || "Reply failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const facebookDeletePost = action({
  args: { accessToken: v.string(), postId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.postId}?access_token=${args.accessToken}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      return res.ok ? { success: true } : { success: false, error: data.error?.message || "Delete failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const instagramPublishPhoto = action({
  args: { accessToken: v.string(), imageUrl: v.string(), caption: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media?image_url=${encodeURIComponent(args.imageUrl)}&caption=${encodeURIComponent(args.caption)}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) return { success: false, error: containerData.error?.message || "Container creation failed" };
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${containerData.id}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const publishData = await publishRes.json();
      return publishRes.ok ? { success: true, mediaId: publishData.id } : { success: false, error: publishData.error?.message || "Publish failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const instagramPublishVideo = action({
  args: { accessToken: v.string(), videoUrl: v.string(), caption: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media?media_type=REELS&video_url=${encodeURIComponent(args.videoUrl)}&caption=${encodeURIComponent(args.caption)}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) return { success: false, error: containerData.error?.message || "Reel container creation failed" };
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${containerData.id}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const publishData = await publishRes.json();
      return publishRes.ok ? { success: true, mediaId: publishData.id } : { success: false, error: publishData.error?.message || "Reel publish failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const instagramPublishCarousel = action({
  args: { accessToken: v.string(), imageUrls: v.array(v.string()), caption: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const children: string[] = [];
      for (const url of args.imageUrls) {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/me/media?image_url=${encodeURIComponent(url)}&access_token=${args.accessToken}`,
          { method: "POST" }
        );
        const data = await res.json();
        if (res.ok && data.id) children.push(data.id);
      }
      if (children.length === 0) return { success: false, error: "No carousel containers created" };
      const carouselRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media?children=${children.join(",")}&caption=${encodeURIComponent(args.caption)}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const carouselData = await carouselRes.json();
      if (!carouselRes.ok || !carouselData.id) return { success: false, error: "Carousel creation failed" };
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/me/media_publish?creation_id=${carouselData.id}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const publishData = await publishRes.json();
      return publishRes.ok ? { success: true, mediaId: publishData.id } : { success: false, error: "Carousel publish failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const instagramGetInsights = action({
  args: { accessToken: v.string(), mediaId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.mediaId}/insights?metric=impressions,reach,engagement,video_views&access_token=${args.accessToken}`,
        { method: "GET" }
      );
      const data = await res.json();
      return res.ok ? { success: true, insights: data.data || [] } : { success: false, error: data.error?.message || "Insights failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const instagramGetComments = action({
  args: { accessToken: v.string(), mediaId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${args.mediaId}/comments?access_token=${args.accessToken}&fields=id,text,timestamp,username`,
        { method: "GET" }
      );
      const data = await res.json();
      return res.ok ? { success: true, comments: data.data || [] } : { success: false, error: data.error?.message || "Get comments failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const instagramSendDM = action({
  args: { accessToken: v.string(), recipientId: v.string(), text: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/messages?recipient=${encodeURIComponent(JSON.stringify({ id: args.recipientId }))}&message=${encodeURIComponent(JSON.stringify({ text: args.text }))}&access_token=${args.accessToken}`,
        { method: "POST" }
      );
      const data = await res.json();
      return res.ok ? { success: true, messageId: data.message_id } : { success: false, error: data.error?.message || "DM failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});
