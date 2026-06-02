/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as TermiiOTP from "../TermiiOTP.js";
import type * as academic_agent from "../academic_agent.js";
import type * as academic_chat from "../academic_chat.js";
import type * as admin from "../admin.js";
import type * as admin_auth from "../admin_auth.js";
import type * as agent_backups from "../agent_backups.js";
import type * as agent_performance from "../agent_performance.js";
import type * as ai_factory from "../ai_factory.js";
import type * as api_costs from "../api_costs.js";
import type * as auth from "../auth.js";
import type * as auth_helpers from "../auth_helpers.js";
import type * as bi_annual_upgrade from "../bi_annual_upgrade.js";
import type * as business_agent from "../business_agent.js";
import type * as business_chat from "../business_chat.js";
import type * as career_agent from "../career_agent.js";
import type * as career_chat from "../career_chat.js";
import type * as certification_agent from "../certification_agent.js";
import type * as certification_chat from "../certification_chat.js";
import type * as charity from "../charity.js";
import type * as chatbot from "../chatbot.js";
import type * as classification from "../classification.js";
import type * as cloud_memory from "../cloud_memory.js";
import type * as communication from "../communication.js";
import type * as content_agent from "../content_agent.js";
import type * as content_chat from "../content_chat.js";
import type * as crm_hygiene from "../crm_hygiene.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as encryption from "../encryption.js";
import type * as event_agent from "../event_agent.js";
import type * as event_chat from "../event_chat.js";
import type * as exam_career_agent from "../exam_career_agent.js";
import type * as exam_career_chat from "../exam_career_chat.js";
import type * as facebook_leads from "../facebook_leads.js";
import type * as feature_flags from "../feature_flags.js";
import type * as finance_agent from "../finance_agent.js";
import type * as finance_chat from "../finance_chat.js";
import type * as fintech from "../fintech.js";
import type * as geo_tracking from "../geo_tracking.js";
import type * as guardian from "../guardian.js";
import type * as guardian_watch from "../guardian_watch.js";
import type * as holidays from "../holidays.js";
import type * as home_agent from "../home_agent.js";
import type * as home_chat from "../home_chat.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as kdp_agent from "../kdp_agent.js";
import type * as kdp_constants from "../kdp_constants.js";
import type * as kdp_subscriptions from "../kdp_subscriptions.js";
import type * as language_agent from "../language_agent.js";
import type * as language_chat from "../language_chat.js";
import type * as lead_scoring from "../lead_scoring.js";
import type * as leaderboard from "../leaderboard.js";
import type * as live_chats from "../live_chats.js";
import type * as marketplace from "../marketplace.js";
import type * as model_recovery from "../model_recovery.js";
import type * as payments from "../payments.js";
import type * as payouts from "../payouts.js";
import type * as platform_analytics from "../platform_analytics.js";
import type * as postiz_ad_engine from "../postiz_ad_engine.js";
import type * as quick_setup from "../quick_setup.js";
import type * as receipts from "../receipts.js";
import type * as reports from "../reports.js";
import type * as secure_sweeps from "../secure_sweeps.js";
import type * as seed from "../seed.js";
import type * as seed_admin from "../seed_admin.js";
import type * as seed_automation from "../seed_automation.js";
import type * as seed_financials from "../seed_financials.js";
import type * as seed_kdp from "../seed_kdp.js";
import type * as seed_migration from "../seed_migration.js";
import type * as shopping_agent from "../shopping_agent.js";
import type * as shopping_chat from "../shopping_chat.js";
import type * as social from "../social.js";
import type * as synthetic_intelligence from "../synthetic_intelligence.js";
import type * as tax from "../tax.js";
import type * as translation_agent from "../translation_agent.js";
import type * as translation_chat from "../translation_chat.js";
import type * as travel_agent from "../travel_agent.js";
import type * as travel_chat from "../travel_chat.js";
import type * as uae_engine from "../uae_engine.js";
import type * as updates from "../updates.js";
import type * as video_agent from "../video_agent.js";
import type * as video_chat from "../video_chat.js";
import type * as voice_roi from "../voice_roi.js";
import type * as wellness_agent from "../wellness_agent.js";
import type * as wellness_chat from "../wellness_chat.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  TermiiOTP: typeof TermiiOTP;
  academic_agent: typeof academic_agent;
  academic_chat: typeof academic_chat;
  admin: typeof admin;
  admin_auth: typeof admin_auth;
  agent_backups: typeof agent_backups;
  agent_performance: typeof agent_performance;
  ai_factory: typeof ai_factory;
  api_costs: typeof api_costs;
  auth: typeof auth;
  auth_helpers: typeof auth_helpers;
  bi_annual_upgrade: typeof bi_annual_upgrade;
  business_agent: typeof business_agent;
  business_chat: typeof business_chat;
  career_agent: typeof career_agent;
  career_chat: typeof career_chat;
  certification_agent: typeof certification_agent;
  certification_chat: typeof certification_chat;
  charity: typeof charity;
  chatbot: typeof chatbot;
  classification: typeof classification;
  cloud_memory: typeof cloud_memory;
  communication: typeof communication;
  content_agent: typeof content_agent;
  content_chat: typeof content_chat;
  crm_hygiene: typeof crm_hygiene;
  crons: typeof crons;
  dashboard: typeof dashboard;
  encryption: typeof encryption;
  event_agent: typeof event_agent;
  event_chat: typeof event_chat;
  exam_career_agent: typeof exam_career_agent;
  exam_career_chat: typeof exam_career_chat;
  facebook_leads: typeof facebook_leads;
  feature_flags: typeof feature_flags;
  finance_agent: typeof finance_agent;
  finance_chat: typeof finance_chat;
  fintech: typeof fintech;
  geo_tracking: typeof geo_tracking;
  guardian: typeof guardian;
  guardian_watch: typeof guardian_watch;
  holidays: typeof holidays;
  home_agent: typeof home_agent;
  home_chat: typeof home_chat;
  http: typeof http;
  init: typeof init;
  kdp_agent: typeof kdp_agent;
  kdp_constants: typeof kdp_constants;
  kdp_subscriptions: typeof kdp_subscriptions;
  language_agent: typeof language_agent;
  language_chat: typeof language_chat;
  lead_scoring: typeof lead_scoring;
  leaderboard: typeof leaderboard;
  live_chats: typeof live_chats;
  marketplace: typeof marketplace;
  model_recovery: typeof model_recovery;
  payments: typeof payments;
  payouts: typeof payouts;
  platform_analytics: typeof platform_analytics;
  postiz_ad_engine: typeof postiz_ad_engine;
  quick_setup: typeof quick_setup;
  receipts: typeof receipts;
  reports: typeof reports;
  secure_sweeps: typeof secure_sweeps;
  seed: typeof seed;
  seed_admin: typeof seed_admin;
  seed_automation: typeof seed_automation;
  seed_financials: typeof seed_financials;
  seed_kdp: typeof seed_kdp;
  seed_migration: typeof seed_migration;
  shopping_agent: typeof shopping_agent;
  shopping_chat: typeof shopping_chat;
  social: typeof social;
  synthetic_intelligence: typeof synthetic_intelligence;
  tax: typeof tax;
  translation_agent: typeof translation_agent;
  translation_chat: typeof translation_chat;
  travel_agent: typeof travel_agent;
  travel_chat: typeof travel_chat;
  uae_engine: typeof uae_engine;
  updates: typeof updates;
  video_agent: typeof video_agent;
  video_chat: typeof video_chat;
  voice_roi: typeof voice_roi;
  wellness_agent: typeof wellness_agent;
  wellness_chat: typeof wellness_chat;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
