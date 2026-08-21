import { v } from "convex/values";
import { action } from "../../_generated/server";

export const redditCreatePost = action({
  args: { accessToken: v.string(), subreddit: v.string(), title: v.string(), text: v.string(), flairId: v.optional(v.string()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const body: any = { sr: args.subreddit, kind: "self", title: args.title, text: args.text };
      if (args.flairId) body.flair_id = args.flairId;
      const res = await fetch("https://oauth.reddit.com/api/submit", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
      });
      const data = await res.json();
      return res.ok ? { success: true, postId: data.jquery?.[0]?.[3] || "reddit_post" } : { success: false, error: data.error || "Reddit post failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const redditGetSubredditInfo = action({
  args: { accessToken: v.string(), subreddit: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://oauth.reddit.com/r/${args.subreddit}/about`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok ? { success: true, subreddit: data.data } : { success: false, error: "Failed to get subreddit info" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const canvaDesignPublish = action({
  args: { accessToken: v.string(), templateId: v.string(), title: v.string(), elements: v.optional(v.any()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.canva.com/v1/designs", {
        method: "POST",
        headers: { Authorization: `Bearer ${args.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ design_type: "template", template_id: args.templateId, title: args.title, ...(args.elements ? { elements: args.elements } : {}) }),
      });
      const data = await res.json();
      return res.ok ? { success: true, design: data } : { success: false, error: data.message || "Canva design failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const canvaListTemplates = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.canva.com/v1/designs?query=template", {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      });
      const data = await res.json();
      return res.ok ? { success: true, templates: data.items || [] } : { success: false, error: "Failed to list templates" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});
