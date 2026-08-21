import { describe, it, expect } from "vitest";
import { PLATFORM_CHAR_LIMITS, PLATFORM_BEST_HOURS, TRENDING_TOPICS } from "./constants";

const ALL_PLATFORMS = [
  "twitter", "linkedin", "facebook", "instagram", "threads",
  "tiktok", "youtube", "pinterest", "reddit", "bluesky",
  "telegram", "discord",
];

describe("PLATFORM_CHAR_LIMITS", () => {
  it("has entries for all 12 platforms", () => {
    for (const platform of ALL_PLATFORMS) {
      expect(PLATFORM_CHAR_LIMITS).toHaveProperty(platform);
    }
    expect(Object.keys(PLATFORM_CHAR_LIMITS)).toHaveLength(12);
  });

  it("each entry is a positive number", () => {
    for (const [platform, limit] of Object.entries(PLATFORM_CHAR_LIMITS)) {
      expect(typeof limit).toBe("number");
      expect(limit).toBeGreaterThan(0);
    }
  });

  it("twitter has limit of 280", () => {
    expect(PLATFORM_CHAR_LIMITS.twitter).toBe(280);
  });

  it("linkedin has limit of 3000", () => {
    expect(PLATFORM_CHAR_LIMITS.linkedin).toBe(3000);
  });

  it("facebook has limit of 63206", () => {
    expect(PLATFORM_CHAR_LIMITS.facebook).toBe(63206);
  });
});

describe("PLATFORM_BEST_HOURS", () => {
  it("has entries for all 12 platforms", () => {
    for (const platform of ALL_PLATFORMS) {
      expect(PLATFORM_BEST_HOURS).toHaveProperty(platform);
    }
    expect(Object.keys(PLATFORM_BEST_HOURS)).toHaveLength(12);
  });

  it("each entry is a non-empty array of numbers", () => {
    for (const [platform, hours] of Object.entries(PLATFORM_BEST_HOURS)) {
      expect(Array.isArray(hours)).toBe(true);
      expect(hours.length).toBeGreaterThan(0);
      for (const h of hours) {
        expect(typeof h).toBe("number");
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(23);
      }
    }
  });

  it("twitter has 4 best hours", () => {
    expect(PLATFORM_BEST_HOURS.twitter).toEqual([8, 12, 17, 21]);
  });

  it("reddit has 5 best hours", () => {
    expect(PLATFORM_BEST_HOURS.reddit).toHaveLength(5);
  });
});

describe("TRENDING_TOPICS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(TRENDING_TOPICS)).toBe(true);
    expect(TRENDING_TOPICS.length).toBeGreaterThan(0);
  });

  it("each entry has topic, category, score, and hashtags", () => {
    for (const topic of TRENDING_TOPICS) {
      expect(typeof topic.topic).toBe("string");
      expect(topic.topic.length).toBeGreaterThan(0);
      expect(typeof topic.category).toBe("string");
      expect(topic.category.length).toBeGreaterThan(0);
      expect(typeof topic.score).toBe("number");
      expect(topic.score).toBeGreaterThan(0);
      expect(Array.isArray(topic.hashtags)).toBe(true);
      expect(topic.hashtags.length).toBeGreaterThan(0);
      for (const tag of topic.hashtags) {
        expect(typeof tag).toBe("string");
        expect(tag.startsWith("#")).toBe(true);
      }
    }
  });

  it("includes the AI agents topic", () => {
    const aiTopic = TRENDING_TOPICS.find((t) => t.topic === "AI agents for small business");
    expect(aiTopic).toBeDefined();
    expect(aiTopic!.category).toBe("ai");
    expect(aiTopic!.score).toBe(95);
  });
});
