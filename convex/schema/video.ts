import { defineTable } from "convex/server";
import { v } from "convex/values";

export const videoTables = {
  video_productions: defineTable({
    userId: v.string(),
    title: v.string(),
    prompt: v.string(),
    genre: v.string(),
    targetDuration: v.number(), // in minutes
    style: v.string(),
    storyData: v.any(),
    scenes: v.array(v.any()),
    status: v.union(
      v.literal("story_developed"),
      v.literal("scenes_generating"),
      v.literal("scenes_complete"),
      v.literal("assembling"),
      v.literal("completed"),
      v.literal("failed")
    ),
    finalVideoUrl: v.optional(v.string()),
    totalDuration: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  video_scenes: defineTable({
    storyId: v.string(),
    sceneIndex: v.number(),
    sceneData: v.any(),
    videoUrl: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("generated"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_story", ["storyId"])
    .index("by_status", ["status"]),
  video_backups: defineTable({
    backupId: v.string(),
    productionCount: v.number(),
    totalSize: v.number(),
    status: v.union(v.literal("completed"), v.literal("failed")),
    createdAt: v.number(),
  }).index("by_backupId", ["backupId"])
    .index("by_created", ["createdAt"]),
};
