import { describe, it, expect } from "vitest";
import { SUPPORTED_PLATFORMS, DAILY_POSTING_TIMES } from "./platforms";

describe("SUPPORTED_PLATFORMS", () => {
  it("has 12 entries", () => {
    expect(SUPPORTED_PLATFORMS).toHaveLength(12);
  });

  it("each platform has id, name, icon, charLimit, supportsCarousel, supportsVideo", () => {
    for (const platform of SUPPORTED_PLATFORMS) {
      expect(typeof platform.id).toBe("string");
      expect(platform.id.length).toBeGreaterThan(0);
      expect(typeof platform.name).toBe("string");
      expect(platform.name.length).toBeGreaterThan(0);
      expect(typeof platform.icon).toBe("string");
      expect(typeof platform.charLimit).toBe("number");
      expect(platform.charLimit).toBeGreaterThan(0);
      expect(typeof platform.supportsCarousel).toBe("boolean");
      expect(typeof platform.supportsVideo).toBe("boolean");
    }
  });

  it("includes twitter with correct properties", () => {
    const twitter = SUPPORTED_PLATFORMS.find((p) => p.id === "twitter");
    expect(twitter).toBeDefined();
    expect(twitter!.name).toBe("X (Twitter)");
    expect(twitter!.charLimit).toBe(280);
    expect(twitter!.supportsCarousel).toBe(false);
    expect(twitter!.supportsVideo).toBe(true);
  });

  it("includes linkedin with carousel and video support", () => {
    const linkedin = SUPPORTED_PLATFORMS.find((p) => p.id === "linkedin");
    expect(linkedin).toBeDefined();
    expect(linkedin!.supportsCarousel).toBe(true);
    expect(linkedin!.supportsVideo).toBe(true);
  });

  it("includes all 12 platform ids", () => {
    const ids = SUPPORTED_PLATFORMS.map((p) => p.id);
    expect(ids).toContain("twitter");
    expect(ids).toContain("linkedin");
    expect(ids).toContain("facebook");
    expect(ids).toContain("instagram");
    expect(ids).toContain("threads");
    expect(ids).toContain("tiktok");
    expect(ids).toContain("youtube");
    expect(ids).toContain("pinterest");
    expect(ids).toContain("reddit");
    expect(ids).toContain("bluesky");
    expect(ids).toContain("telegram");
    expect(ids).toContain("discord");
  });
});

describe("DAILY_POSTING_TIMES", () => {
  it("has 3 entries", () => {
    expect(DAILY_POSTING_TIMES).toHaveLength(3);
  });

  it("each entry has hour and label", () => {
    for (const entry of DAILY_POSTING_TIMES) {
      expect(typeof entry.hour).toBe("number");
      expect(entry.hour).toBeGreaterThanOrEqual(0);
      expect(entry.hour).toBeLessThanOrEqual(23);
      expect(typeof entry.label).toBe("string");
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it("has Morning Briefing at hour 8", () => {
    const morning = DAILY_POSTING_TIMES.find((e) => e.hour === 8);
    expect(morning).toBeDefined();
    expect(morning!.label).toBe("Morning Briefing");
  });

  it("has Midday Update at hour 12", () => {
    const midday = DAILY_POSTING_TIMES.find((e) => e.hour === 12);
    expect(midday).toBeDefined();
    expect(midday!.label).toBe("Midday Update");
  });

  it("has Evening Wrap at hour 18", () => {
    const evening = DAILY_POSTING_TIMES.find((e) => e.hour === 18);
    expect(evening).toBeDefined();
    expect(evening!.label).toBe("Evening Wrap");
  });
});
