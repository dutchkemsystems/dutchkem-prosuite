// Mimo core constants extracted from mimo_core.ts
import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════
// MIMO V.2.5 — AUTONOMOUS INTELLIGENCE CORE
// ═══════════════════════════════════════════════════════════════
// Complete autonomous intelligence system for Dutchkem Ventures.
// ADDITIVE ONLY — existing features 100% intact.

const COMPONENTS = ["convex", "vercel", "github", "api", "database", "agents", "payments", "security"] as const;
const AGENTS = [
  { id: "A1", name: "Academic Pro", capabilities: ["research", "writing", "analysis"] },
  { id: "A2", name: "Business Pro", capabilities: ["strategy", "planning", "consulting"] },
  { id: "A3", name: "Content Pro", capabilities: ["content", "social", "marketing"] },
  { id: "A4", name: "Career Pro", capabilities: ["resume", "career", "coaching"] },
  { id: "A5", name: "Personal Shopper", capabilities: ["shopping", "deals", "comparison"] },
  { id: "A6", name: "Exam Pro", capabilities: ["exam", "study", "test_prep"] },
  { id: "A7", name: "Finance Pro", capabilities: ["finance", "budgeting", "taxes"] },
  { id: "A8", name: "MediaStudio Pro", capabilities: ["video", "audio", "media"] },
  { id: "A9", name: "Wellness Pro", capabilities: ["health", "fitness", "wellness"] },
  { id: "A10", name: "Home Services", capabilities: ["home", "repair", "maintenance"] },
  { id: "A11", name: "Language Tutor", capabilities: ["language", "learning", "tutoring"] },
  { id: "A12", name: "Travel Planner", capabilities: ["travel", "booking", "itinerary"] },
  { id: "A13", name: "ServiceMart NG", capabilities: ["services", "marketplace", "local"] },
  { id: "A14", name: "Translation Hub", capabilities: ["translation", "localization", "interpretation"] },
  { id: "A15", name: "Event Planner", capabilities: ["events", "planning", "coordination"] },
];

// ─── CORE STATE ───
