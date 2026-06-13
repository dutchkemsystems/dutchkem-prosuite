/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as AwsEmailOTP from "../AwsEmailOTP.js";
import type * as TermiiOTP from "../TermiiOTP.js";
import type * as abandonedCheckouts from "../abandonedCheckouts.js";
import type * as academic_agent from "../academic_agent.js";
import type * as academic_chat from "../academic_chat.js";
import type * as adEngine from "../adEngine.js";
import type * as ad_abtest from "../ad_abtest.js";
import type * as ad_analytics_agg from "../ad_analytics_agg.js";
import type * as ad_budget from "../ad_budget.js";
import type * as ad_campaign_ai from "../ad_campaign_ai.js";
import type * as ad_compliance from "../ad_compliance.js";
import type * as ad_monetization from "../ad_monetization.js";
import type * as admin from "../admin.js";
import type * as admin_auth from "../admin_auth.js";
import type * as admin_enterprise from "../admin_enterprise.js";
import type * as admin_enterprise_hub from "../admin_enterprise_hub.js";
import type * as admin_helpers from "../admin_helpers.js";
import type * as admin_payouts from "../admin_payouts.js";
import type * as agent_analytics from "../agent_analytics.js";
import type * as agent_backups from "../agent_backups.js";
import type * as agent_marketplace from "../agent_marketplace.js";
import type * as agent_performance from "../agent_performance.js";
import type * as agent_runtime from "../agent_runtime.js";
import type * as agentic_payments from "../agentic_payments.js";
import type * as ai_factory from "../ai_factory.js";
import type * as api_costs from "../api_costs.js";
import type * as auth from "../auth.js";
import type * as auth_helpers from "../auth_helpers.js";
import type * as autoPosting from "../autoPosting.js";
import type * as auto_heal from "../auto_heal.js";
import type * as auto_healer from "../auto_healer.js";
import type * as aws_otp from "../aws_otp.js";
import type * as aws_sigv4 from "../aws_sigv4.js";
import type * as bi_annual_upgrade from "../bi_annual_upgrade.js";
import type * as business_agent from "../business_agent.js";
import type * as business_chat from "../business_chat.js";
import type * as cac_deductions from "../cac_deductions.js";
import type * as career_agent from "../career_agent.js";
import type * as career_chat from "../career_chat.js";
import type * as certification_agent from "../certification_agent.js";
import type * as certification_chat from "../certification_chat.js";
import type * as charity from "../charity.js";
import type * as chatbot from "../chatbot.js";
import type * as chatbotLeads from "../chatbotLeads.js";
import type * as classification from "../classification.js";
import type * as clientAnalytics from "../clientAnalytics.js";
import type * as client_actions from "../client_actions.js";
import type * as client_kyc from "../client_kyc.js";
import type * as client_payouts from "../client_payouts.js";
import type * as client_wallet from "../client_wallet.js";
import type * as cloud_memory from "../cloud_memory.js";
import type * as communication from "../communication.js";
import type * as companion_agent from "../companion_agent.js";
import type * as composioClient from "../composioClient.js";
import type * as composioEnhanced from "../composioEnhanced.js";
import type * as composioEnhancement from "../composioEnhancement.js";
import type * as composioHub from "../composioHub.js";
import type * as composioToolkitDetails from "../composioToolkitDetails.js";
import type * as composio_admin from "../composio_admin.js";
import type * as content_agent from "../content_agent.js";
import type * as content_chat from "../content_chat.js";
import type * as crm_hygiene from "../crm_hygiene.js";
import type * as crons from "../crons.js";
import type * as crossSell from "../crossSell.js";
import type * as dashboard from "../dashboard.js";
import type * as emotional_ai from "../emotional_ai.js";
import type * as encryption from "../encryption.js";
import type * as enterprise_audit_logs from "../enterprise_audit_logs.js";
import type * as enterprise_auth from "../enterprise_auth.js";
import type * as enterprise_autonomous from "../enterprise_autonomous.js";
import type * as enterprise_companies from "../enterprise_companies.js";
import type * as enterprise_companion from "../enterprise_companion.js";
import type * as enterprise_emotional from "../enterprise_emotional.js";
import type * as enterprise_knowledge from "../enterprise_knowledge.js";
import type * as enterprise_marketplace from "../enterprise_marketplace.js";
import type * as enterprise_marketplace_templates from "../enterprise_marketplace_templates.js";
import type * as enterprise_payments from "../enterprise_payments.js";
import type * as enterprise_scaling from "../enterprise_scaling.js";
import type * as enterprise_security from "../enterprise_security.js";
import type * as enterprise_sla from "../enterprise_sla.js";
import type * as enterprise_subadmins from "../enterprise_subadmins.js";
import type * as enterprise_support from "../enterprise_support.js";
import type * as enterprise_workflows from "../enterprise_workflows.js";
import type * as event_agent from "../event_agent.js";
import type * as event_chat from "../event_chat.js";
import type * as exam_career_agent from "../exam_career_agent.js";
import type * as exam_career_chat from "../exam_career_chat.js";
import type * as exitIntent from "../exitIntent.js";
import type * as facebook_leads from "../facebook_leads.js";
import type * as feature_flags from "../feature_flags.js";
import type * as finance_agent from "../finance_agent.js";
import type * as finance_chat from "../finance_chat.js";
import type * as fintech from "../fintech.js";
import type * as flashSales from "../flashSales.js";
import type * as flyer_engine from "../flyer_engine.js";
import type * as flyer_posting from "../flyer_posting.js";
import type * as flyer_templates from "../flyer_templates.js";
import type * as gamification from "../gamification.js";
import type * as geo_blocking from "../geo_blocking.js";
import type * as geo_tracking from "../geo_tracking.js";
import type * as guardian from "../guardian.js";
import type * as guardian_watch from "../guardian_watch.js";
import type * as holidays from "../holidays.js";
import type * as home_agent from "../home_agent.js";
import type * as home_chat from "../home_chat.js";
import type * as http from "../http.js";
import type * as influencerRecruitment from "../influencerRecruitment.js";
import type * as init from "../init.js";
import type * as intrusion_detector from "../intrusion_detector.js";
import type * as kdp_agent from "../kdp_agent.js";
import type * as kdp_constants from "../kdp_constants.js";
import type * as kdp_subscriptions from "../kdp_subscriptions.js";
import type * as knowledge_graph from "../knowledge_graph.js";
import type * as kora_pay from "../kora_pay.js";
import type * as kora_webhook from "../kora_webhook.js";
import type * as language_agent from "../language_agent.js";
import type * as language_chat from "../language_chat.js";
import type * as lead_scoring from "../lead_scoring.js";
import type * as leaderboard from "../leaderboard.js";
import type * as live_chats from "../live_chats.js";
import type * as live_feeds from "../live_feeds.js";
import type * as marketplace from "../marketplace.js";
import type * as mimo_core from "../mimo_core.js";
import type * as model_recovery from "../model_recovery.js";
import type * as orchestration from "../orchestration.js";
import type * as otp_email from "../otp_email.js";
import type * as payments from "../payments.js";
import type * as payouts from "../payouts.js";
import type * as platformOAuth from "../platformOAuth.js";
import type * as platform_analytics from "../platform_analytics.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as quick_setup from "../quick_setup.js";
import type * as rapidapi from "../rapidapi.js";
import type * as receipts from "../receipts.js";
import type * as receipts_v2 from "../receipts_v2.js";
import type * as referrals from "../referrals.js";
import type * as reports from "../reports.js";
import type * as revenue_credits from "../revenue_credits.js";
import type * as revenue_marketplace from "../revenue_marketplace.js";
import type * as revenue_outcomes from "../revenue_outcomes.js";
import type * as revenue_social from "../revenue_social.js";
import type * as scheduledPosts from "../scheduledPosts.js";
import type * as secure_sweeps from "../secure_sweeps.js";
import type * as seed from "../seed.js";
import type * as seed_admin from "../seed_admin.js";
import type * as seed_automation from "../seed_automation.js";
import type * as seed_financials from "../seed_financials.js";
import type * as seed_kdp from "../seed_kdp.js";
import type * as seed_marketplace_templates from "../seed_marketplace_templates.js";
import type * as seed_migration from "../seed_migration.js";
import type * as seed_test from "../seed_test.js";
import type * as seoEngine from "../seoEngine.js";
import type * as shopping_agent from "../shopping_agent.js";
import type * as shopping_chat from "../shopping_chat.js";
import type * as social from "../social.js";
import type * as socialProof from "../socialProof.js";
import type * as subscription_guard from "../subscription_guard.js";
import type * as subscription_renewal from "../subscription_renewal.js";
import type * as synthetic_intelligence from "../synthetic_intelligence.js";
import type * as tax from "../tax.js";
import type * as teamAccounts from "../teamAccounts.js";
import type * as testimonials from "../testimonials.js";
import type * as tithe_deductions from "../tithe_deductions.js";
import type * as transfer_passkeys from "../transfer_passkeys.js";
import type * as translation_agent from "../translation_agent.js";
import type * as translation_chat from "../translation_chat.js";
import type * as travel_agent from "../travel_agent.js";
import type * as travel_chat from "../travel_chat.js";
import type * as trypost from "../trypost.js";
import type * as trypost_webhook from "../trypost_webhook.js";
import type * as uae_engine from "../uae_engine.js";
import type * as updates from "../updates.js";
import type * as usage_alerts from "../usage_alerts.js";
import type * as usd_wallet from "../usd_wallet.js";
import type * as version_control from "../version_control.js";
import type * as video_agent from "../video_agent.js";
import type * as video_chat from "../video_chat.js";
import type * as voice_roi from "../voice_roi.js";
import type * as webhook_notifications from "../webhook_notifications.js";
import type * as wellness_agent from "../wellness_agent.js";
import type * as wellness_chat from "../wellness_chat.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  AwsEmailOTP: typeof AwsEmailOTP;
  TermiiOTP: typeof TermiiOTP;
  abandonedCheckouts: typeof abandonedCheckouts;
  academic_agent: typeof academic_agent;
  academic_chat: typeof academic_chat;
  adEngine: typeof adEngine;
  ad_abtest: typeof ad_abtest;
  ad_analytics_agg: typeof ad_analytics_agg;
  ad_budget: typeof ad_budget;
  ad_campaign_ai: typeof ad_campaign_ai;
  ad_compliance: typeof ad_compliance;
  ad_monetization: typeof ad_monetization;
  admin: typeof admin;
  admin_auth: typeof admin_auth;
  admin_enterprise: typeof admin_enterprise;
  admin_enterprise_hub: typeof admin_enterprise_hub;
  admin_helpers: typeof admin_helpers;
  admin_payouts: typeof admin_payouts;
  agent_analytics: typeof agent_analytics;
  agent_backups: typeof agent_backups;
  agent_marketplace: typeof agent_marketplace;
  agent_performance: typeof agent_performance;
  agent_runtime: typeof agent_runtime;
  agentic_payments: typeof agentic_payments;
  ai_factory: typeof ai_factory;
  api_costs: typeof api_costs;
  auth: typeof auth;
  auth_helpers: typeof auth_helpers;
  autoPosting: typeof autoPosting;
  auto_heal: typeof auto_heal;
  auto_healer: typeof auto_healer;
  aws_otp: typeof aws_otp;
  aws_sigv4: typeof aws_sigv4;
  bi_annual_upgrade: typeof bi_annual_upgrade;
  business_agent: typeof business_agent;
  business_chat: typeof business_chat;
  cac_deductions: typeof cac_deductions;
  career_agent: typeof career_agent;
  career_chat: typeof career_chat;
  certification_agent: typeof certification_agent;
  certification_chat: typeof certification_chat;
  charity: typeof charity;
  chatbot: typeof chatbot;
  chatbotLeads: typeof chatbotLeads;
  classification: typeof classification;
  clientAnalytics: typeof clientAnalytics;
  client_actions: typeof client_actions;
  client_kyc: typeof client_kyc;
  client_payouts: typeof client_payouts;
  client_wallet: typeof client_wallet;
  cloud_memory: typeof cloud_memory;
  communication: typeof communication;
  companion_agent: typeof companion_agent;
  composioClient: typeof composioClient;
  composioEnhanced: typeof composioEnhanced;
  composioEnhancement: typeof composioEnhancement;
  composioHub: typeof composioHub;
  composioToolkitDetails: typeof composioToolkitDetails;
  composio_admin: typeof composio_admin;
  content_agent: typeof content_agent;
  content_chat: typeof content_chat;
  crm_hygiene: typeof crm_hygiene;
  crons: typeof crons;
  crossSell: typeof crossSell;
  dashboard: typeof dashboard;
  emotional_ai: typeof emotional_ai;
  encryption: typeof encryption;
  enterprise_audit_logs: typeof enterprise_audit_logs;
  enterprise_auth: typeof enterprise_auth;
  enterprise_autonomous: typeof enterprise_autonomous;
  enterprise_companies: typeof enterprise_companies;
  enterprise_companion: typeof enterprise_companion;
  enterprise_emotional: typeof enterprise_emotional;
  enterprise_knowledge: typeof enterprise_knowledge;
  enterprise_marketplace: typeof enterprise_marketplace;
  enterprise_marketplace_templates: typeof enterprise_marketplace_templates;
  enterprise_payments: typeof enterprise_payments;
  enterprise_scaling: typeof enterprise_scaling;
  enterprise_security: typeof enterprise_security;
  enterprise_sla: typeof enterprise_sla;
  enterprise_subadmins: typeof enterprise_subadmins;
  enterprise_support: typeof enterprise_support;
  enterprise_workflows: typeof enterprise_workflows;
  event_agent: typeof event_agent;
  event_chat: typeof event_chat;
  exam_career_agent: typeof exam_career_agent;
  exam_career_chat: typeof exam_career_chat;
  exitIntent: typeof exitIntent;
  facebook_leads: typeof facebook_leads;
  feature_flags: typeof feature_flags;
  finance_agent: typeof finance_agent;
  finance_chat: typeof finance_chat;
  fintech: typeof fintech;
  flashSales: typeof flashSales;
  flyer_engine: typeof flyer_engine;
  flyer_posting: typeof flyer_posting;
  flyer_templates: typeof flyer_templates;
  gamification: typeof gamification;
  geo_blocking: typeof geo_blocking;
  geo_tracking: typeof geo_tracking;
  guardian: typeof guardian;
  guardian_watch: typeof guardian_watch;
  holidays: typeof holidays;
  home_agent: typeof home_agent;
  home_chat: typeof home_chat;
  http: typeof http;
  influencerRecruitment: typeof influencerRecruitment;
  init: typeof init;
  intrusion_detector: typeof intrusion_detector;
  kdp_agent: typeof kdp_agent;
  kdp_constants: typeof kdp_constants;
  kdp_subscriptions: typeof kdp_subscriptions;
  knowledge_graph: typeof knowledge_graph;
  kora_pay: typeof kora_pay;
  kora_webhook: typeof kora_webhook;
  language_agent: typeof language_agent;
  language_chat: typeof language_chat;
  lead_scoring: typeof lead_scoring;
  leaderboard: typeof leaderboard;
  live_chats: typeof live_chats;
  live_feeds: typeof live_feeds;
  marketplace: typeof marketplace;
  mimo_core: typeof mimo_core;
  model_recovery: typeof model_recovery;
  orchestration: typeof orchestration;
  otp_email: typeof otp_email;
  payments: typeof payments;
  payouts: typeof payouts;
  platformOAuth: typeof platformOAuth;
  platform_analytics: typeof platform_analytics;
  pushNotifications: typeof pushNotifications;
  quick_setup: typeof quick_setup;
  rapidapi: typeof rapidapi;
  receipts: typeof receipts;
  receipts_v2: typeof receipts_v2;
  referrals: typeof referrals;
  reports: typeof reports;
  revenue_credits: typeof revenue_credits;
  revenue_marketplace: typeof revenue_marketplace;
  revenue_outcomes: typeof revenue_outcomes;
  revenue_social: typeof revenue_social;
  scheduledPosts: typeof scheduledPosts;
  secure_sweeps: typeof secure_sweeps;
  seed: typeof seed;
  seed_admin: typeof seed_admin;
  seed_automation: typeof seed_automation;
  seed_financials: typeof seed_financials;
  seed_kdp: typeof seed_kdp;
  seed_marketplace_templates: typeof seed_marketplace_templates;
  seed_migration: typeof seed_migration;
  seed_test: typeof seed_test;
  seoEngine: typeof seoEngine;
  shopping_agent: typeof shopping_agent;
  shopping_chat: typeof shopping_chat;
  social: typeof social;
  socialProof: typeof socialProof;
  subscription_guard: typeof subscription_guard;
  subscription_renewal: typeof subscription_renewal;
  synthetic_intelligence: typeof synthetic_intelligence;
  tax: typeof tax;
  teamAccounts: typeof teamAccounts;
  testimonials: typeof testimonials;
  tithe_deductions: typeof tithe_deductions;
  transfer_passkeys: typeof transfer_passkeys;
  translation_agent: typeof translation_agent;
  translation_chat: typeof translation_chat;
  travel_agent: typeof travel_agent;
  travel_chat: typeof travel_chat;
  trypost: typeof trypost;
  trypost_webhook: typeof trypost_webhook;
  uae_engine: typeof uae_engine;
  updates: typeof updates;
  usage_alerts: typeof usage_alerts;
  usd_wallet: typeof usd_wallet;
  version_control: typeof version_control;
  video_agent: typeof video_agent;
  video_chat: typeof video_chat;
  voice_roi: typeof voice_roi;
  webhook_notifications: typeof webhook_notifications;
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
