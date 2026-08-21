import { v } from "convex/values";
import { action } from "../../_generated/server";

export const linkedinGetProfile = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~digitalmediaStream:playableStreams),headline,industry,summary)", {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      });
      const data = await res.json();
      return res.ok ? { success: true, profile: data } : { success: false, error: "Failed to get LinkedIn profile" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const linkedinGetOrganizations = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch("https://api.linkedin.com/v2/organizationalContactRoleProjection~projection=(elements*(organizationalTarget~(id,name,vanityName)))", {
        headers: { Authorization: `Bearer ${args.accessToken}` },
      });
      const data = await res.json();
      return res.ok ? { success: true, organizations: data.elements || [] } : { success: false, error: "Failed to get organizations" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const youtubeGetChannelInfo = action({
  args: { accessToken: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok && data.items?.length > 0 ? { success: true, channel: data.items[0] } : { success: false, error: "No channel found" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const youtubeListVideos = action({
  args: { accessToken: v.string(), maxResults: v.optional(v.number()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const channelData = await channelRes.json();
      if (!channelData.items?.length) return { success: false, error: "No channel found" };
      const uploadsPlaylist = channelData.items[0].contentDetails.relatedPlaylists.uploads;
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylist}&maxResults=${args.maxResults || 10}`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok ? { success: true, videos: data.items || [] } : { success: false, error: "Failed to list videos" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const youtubeGetAnalytics = action({
  args: { accessToken: v.string(), videoId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${args.videoId}`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok && data.items?.length > 0 ? { success: true, analytics: data.items[0].statistics, snippet: data.items[0].snippet } : { success: false, error: "No video data" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});

export const youtubeTrackPerformance = action({
  args: { accessToken: v.string(), videoIds: v.array(v.string()) },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${args.videoIds.join(",")}`,
        { headers: { Authorization: `Bearer ${args.accessToken}` } }
      );
      const data = await res.json();
      return res.ok ? { success: true, videos: (data.items || []).map((v: any) => ({ id: v.id, title: v.snippet?.title, stats: v.statistics })) } : { success: false, error: "Tracking failed" };
    } catch (e: any) { return { success: false, error: e.message }; }
  },
});
