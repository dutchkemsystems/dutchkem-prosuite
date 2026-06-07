import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

// Note: Functions registered with `query`, `mutation`, or `action` (public)
// must be referenced via `api.*`. Only `internalQuery`, `internalMutation`,
// `internalAction` can be referenced via `internal.*`.

const crons = cronJobs();

// 💰 Financials & Payouts
// Freelancer Marketplace: escrow payouts every Friday 2 PM
crons.cron(
  "freelancer marketplace payouts",
  "0 14 * * 5",
  internal.marketplace.runMarketplacePayouts,
  {}
);
// Legacy: still run existing freelancer payout logic
crons.cron(
  "freelancer weekly payouts",
  "0 14 * * 5",
  internal.payouts.runFreelancerPayouts,
  {}
);
crons.cron(
  "referral weekly payouts",
  "30 14 * * 5",
  internal.payouts.runReferralPayouts,
  {}
);
crons.cron(
  "owner daily sweep",
  "0 22 * * *",
  api.payouts.runDailySweep,
  {}
);

// 🏛️ Tax & Ledger
crons.cron(
  "daily tax deduction",
  "59 22 * * *",
  internal.tax.runDailyTaxDeduction,
  {}
);
crons.cron(
  "daily interest accrual",
  "59 22 * * *",
  internal.tax.runDailyInterestAccrual,
  {}
);
// Annual CAC tax filing + year-end remittance to PalmPay
crons.cron(
  "annual tax filing",
  "0 23 31 12 *",
  internal.tax.runAnnualTaxFiling,
  {}
);

// 🏛️ Freelancer Marketplace: Daily Platform-Fee Sweep (11 PM)
crons.cron(
  "daily platform fee sweep",
  "0 23 * * *",
  internal.marketplace.runDailyPlatformSweep,
  {}
);

// 💻 Monthly API Cost Deduction (1st of each month at 1 AM)
crons.cron(
  "monthly api cost deduction",
  "0 1 1 * *",
  internal.api_costs.deductMonthlyApiCosts,
  {}
);

// 💳 Subscriptions
crons.interval(
  "process subscription renewals",
  { hours: 1 },
  internal.payments.processSubscriptionRenewals,
  {}
);

// 📣 Social Media Engine (Disabled: rotateSocialAgents removed in social engine rewrite)
// crons.cron(
//   "social post morning",
//   "0 9 * * *",
//   internal.social.rotateSocialAgents,
//   {}
// );
// crons.cron(
//   "social post afternoon",
//   "0 13 * * *",
//   internal.social.rotateSocialAgents,
//   {}
// );
// crons.cron(
//   "social post evening",
//   "0 18 * * *",
//   internal.social.rotateSocialAgents,
//   {}
// );
// Disabled: processScheduledPosts removed in social engine rewrite
// crons.interval(
//   "process scheduled social",
//   { minutes: 10 },
//   internal.social.processScheduledPosts,
//   {}
// );

// 🛡️ Guardian Watch (Self-Healing)
crons.interval(
  "full diagnosis",
  { hours: 1 },
  api.guardian_watch.runFullDiagnosis,
  {}
);
crons.interval(
  "rapid agent pulse",
  { minutes: 15 },
  internal.guardian_watch.testAgents,
  {}
);
crons.interval(
  "payment gateway check",
  { minutes: 30 },
  internal.guardian_watch.testPaymentGateways,
  {}
);

// ✨ UAE Engine (Autonomous Evolution & Holidays)
crons.cron(
  "holiday discount refresh",
  "5 0 * * *",
  api.holidays.refreshActiveDiscounts,
  {}
);
crons.cron(
  "spring service update",
  "0 2 1 5 *",
  api.updates.runServiceUpdates,
  {}
);
crons.cron(
  "fall service update",
  "0 2 1 11 *",
  api.updates.runServiceUpdates,
  {}
);

// 🔄 Bi-Annual Auto-Upgrade Scheduler (offset by 30 min to avoid collision with service updates)
crons.cron(
  "spring service upgrade",
  "30 2 1 5 *",
  api.bi_annual_upgrade.runBiAnnualUpgrade,
  {}
);
crons.cron(
  "fall service upgrade",
  "30 2 1 11 *",
  api.bi_annual_upgrade.runBiAnnualUpgrade,
  {}
);

// 🏥 Model Health
crons.interval(
  "model health recovery",
  { minutes: 5 },
  internal.model_recovery.recoverModelHealth,
  {}
);

// 🕊️ Charity / Tithe Deduction System
crons.cron(
  "daily charity deduction",
  "0 23 * * *",
  internal.charity.runDailyCharityDeduction,
  {}
);
crons.cron(
  "monthly charity transfer",
  "59 22 28-31 * *",
  internal.charity.runMonthlyCharityTransfer,
  {}
);

// ═══════════════════════════════════════════════════════════════════
// NEW: Feature Automation (Lead Scoring, Workflows, Leaderboard, Hygiene)
// ═══════════════════════════════════════════════════════════════════

// 🎯 Lead Scoring - Calculate scores nightly
crons.cron(
  "calculate lead scores",
  "0 2 * * *", // 2 AM daily
  internal.lead_scoring.calculateAllLeadScores,
  {}
);

// ⚙️ Workflows - Evaluate scheduled workflows every hour
crons.interval(
  "evaluate workflows",
  { hours: 1 },
  internal.workflows.evaluateWorkflows,
  {}
);

// 🏆 Leaderboard - Calculate rankings at midnight
crons.cron(
  "calculate daily leaderboard",
  "0 0 * * *", // Midnight daily
  internal.leaderboard.calculateLeaderboard,
  { period: "daily" }
);
crons.cron(
  "calculate weekly leaderboard",
  "0 0 * * 1", // Monday midnight
  internal.leaderboard.calculateLeaderboard,
  { period: "weekly" }
);
crons.cron(
  "calculate monthly leaderboard",
  "0 0 1 * *", // 1st of month midnight
  internal.leaderboard.calculateLeaderboard,
  { period: "monthly" }
);

// 📊 Reports - Process scheduled reports every hour
crons.interval(
  "process scheduled reports",
  { hours: 1 },
  internal.reports.processScheduledReports,
  {}
);

// 🧹 CRM Hygiene - Weekly scan (Sunday 3 AM)
crons.cron(
  "crm hygiene scan",
  "0 3 * * 0", // Sunday 3 AM
  internal.crm_hygiene.runHygieneScan,
  {}
);

// ☁️ Cloud Memory & Self-Healing System
// Auto-backup system every 6 hours
crons.interval(
  "auto backup system",
  { hours: 6 },
  internal.cloud_memory.autoBackupSystem,
  {}
);

// Self-healing check every 30 minutes
crons.interval(
  "self-healing check",
  { minutes: 30 },
  internal.cloud_memory.runSelfHealing,
  {}
);

// ═══════════════════════════════════════════════════════════════════
// PHASE 2: ABANDONED CHECKOUT RECOVERY & FLASH SALES
// ═══════════════════════════════════════════════════════════════════

// 🛒 Abandoned Checkout Recovery - Check every hour
crons.interval(
  "process abandoned checkouts",
  { hours: 1 },
  api.abandonedCheckouts.processAbandonedCheckouts,
  {}
);

// 🛒 Cancel old abandoned checkouts - Daily at 3 AM
crons.cron(
  "cancel old abandoned checkouts",
  "0 3 * * *",
  internal.abandonedCheckouts.cancelOldCheckouts,
  {}
);

// ⚡ Flash Sale Expiry - Check every 5 minutes
crons.interval(
  "expire flash sales",
  { minutes: 5 },
  internal.flashSales.expireFlashSales,
  {}
);

// 📅 Scheduled Social Posts - Process every minute
crons.interval(
  "process scheduled social posts",
  { minutes: 1 },
  internal.scheduledPosts.processScheduledPosts,
  {}
);

// 📢 Scheduled Ad Posts - Process every minute
crons.interval(
  "process scheduled ad posts",
  { minutes: 1 },
  internal.adEngine.processScheduledAds,
  {}
);

// Auto-backup synthetic agent configs every 12 hours
crons.interval(
  "auto backup synthetic agents",
  { hours: 12 },
  internal.agent_backups.autoBackup,
  {}
);

// ═══════════════════════════════════════════════════════════════════
// FINANCIAL AUTOMATION SYSTEM (Renewals, Tithe, CAC, Usage Alerts)
// ═══════════════════════════════════════════════════════════════════

// 🔄 29-day subscription renewal check (every hour)
crons.interval(
  "process 29-day subscription renewals",
  { hours: 1 },
  internal.subscription_renewal.processAutoRenewals,
  {}
);

// 🌱 Seed default subscription configs (monthly safety net)
crons.cron(
  "seed default subscription configs",
  "0 0 1 * *",
  internal.subscription_renewal.seedDefaultConfigs,
  {}
);

// 🕊️ Daily tithe deduction (10% of revenue - last day of day)
crons.cron(
  "daily tithe deduction",
  "55 23 * * *",
  internal.tithe_deductions.runDailyTitheDeduction,
  {}
);

// 🕊️ Monthly tithe transfer to designated account
crons.cron(
  "monthly tithe transfer",
  "58 23 28-31 * *",
  internal.tithe_deductions.runMonthlyTitheTransfer,
  {}
);

// 🏛️ Monthly CAC annual fraction deduction (1st of month)
crons.cron(
  "monthly CAC deduction",
  "5 0 1 * *",
  internal.cac_deductions.runMonthlyCacDeduction,
  {}
);

// 🏛️ Annual CAC filing (Dec 31)
crons.cron(
  "annual CAC filing",
  "30 23 31 12 *",
  internal.cac_deductions.runAnnualCacFiling,
  {}
);

// 📊 Usage threshold check (80%, 90%, 95%, 100%) - every 6 hours
crons.interval(
  "check usage thresholds",
  { hours: 6 },
  internal.usage_alerts.checkUsageThresholds,
  {}
);

// 🔑 Cleanup expired passkeys (every hour)
crons.interval(
  "cleanup expired passkeys",
  { hours: 1 },
  internal.transfer_passkeys.cleanupExpiredPasskeys,
  {}
);

// ═══════════════════════════════════════════════════════════════════
// COMPOSIO ENHANCED + TRYPOST AUTOMATION
// ═══════════════════════════════════════════════════════════════════

// 🧹 Cleanup expired Composio Tool Router sessions (every hour)
crons.interval(
  "cleanup expired composio sessions",
  { hours: 1 },
  internal.composioEnhanced.cleanupExpiredSessions,
  {}
);

// 🔄 Refresh Composio tool catalog (daily at 3 AM)
crons.cron(
  "refresh composio tool catalog",
  "0 3 * * *",
  internal.composioEnhanced.refreshToolCatalog,
  {}
);

// 📅 Process TryPost scheduled posts due for publication (every minute)
crons.interval(
  "process TryPost due posts",
  { minutes: 1 },
  internal.trypost.processDuePosts,
  {}
);

// 🌅 Daily TryPost posting - morning briefing (8 AM WAT)
crons.cron(
  "trypost daily morning briefing",
  "0 8 * * *",
  internal.trypost.executeDailyPosting,
  { hourSlot: 8 }
);

// ☀️ Daily TryPost posting - midday update (12 PM WAT)
crons.cron(
  "trypost daily midday update",
  "0 12 * * *",
  internal.trypost.executeDailyPosting,
  { hourSlot: 12 }
);

// 🌆 Daily TryPost posting - evening wrap (6 PM WAT)
crons.cron(
  "trypost daily evening wrap",
  "0 18 * * *",
  internal.trypost.executeDailyPosting,
  { hourSlot: 18 }
);

// 📊 Refresh TryPost analytics (every 4 hours)
crons.interval(
  "refresh trypost analytics",
  { hours: 4 },
  internal.trypost.refreshAnalytics,
  {}
);

// ═══════════════════════════════════════════════════════════════════
// GLOBAL EXPANSION — SECURITY, HEALING, AGENT PERFORMANCE
// ═══════════════════════════════════════════════════════════════════

// 🛡️ Auto-Heal check (every 30 minutes)
crons.interval(
  "auto-heal check",
  { minutes: 30 },
  internal.auto_healer.runAutoHeal,
  {}
);

// 📊 Daily health report (11 PM)
crons.cron(
  "daily health report",
  "0 23 * * *",
  internal.auto_healer.dailyHealthReport,
  {}
);

// 🤖 Auto-test all 15 agents (every hour)
crons.interval(
  "auto-test all agents",
  { hours: 1 },
  internal.auto_healer.autoTestAllAgents,
  {}
);

// 🔍 Detect underperforming agents (every 6 hours)
crons.interval(
  "detect underperforming agents",
  { hours: 6 },
  internal.agent_performance._takeAgentSnapshots,
  {}
);

// 🛡️ Monitor login attempts (every 15 minutes)
crons.interval(
  "monitor login attempts",
  { minutes: 15 },
  internal.intrusion_detector._monitorLoginAttempts,
  {}
);

// ☁️ Consolidate cloud memory (daily at 2 AM)
crons.cron(
  "consolidate cloud memory",
  "0 2 * * *",
  internal.cloud_memory.consolidateMemory,
  {}
);

// 📊 Agent snapshot collection (every 4 hours)
crons.interval(
  "agent snapshot collection",
  { hours: 4 },
  internal.agent_performance._takeAgentSnapshots,
  {}
);

// ═══════════════════════════════════════════════════════════════════
// NIGERIA TAX ACT 2025 — COMPLIANCE AUTOMATION
// ═══════════════════════════════════════════════════════════════════

// 📋 Seed expense categories (1st of year safety net)
crons.cron(
  "seed expense categories",
  "0 0 1 1 *",
  internal.tax.seedExpenseCategories,
  {}
);

// 📅 Seed tax payment schedule (1st of year)
crons.cron(
  "seed tax payment schedule",
  "0 1 1 1 *",
  internal.tax.seedTaxPaymentSchedule,
  { taxYear: new Date().getFullYear() }
);

// ⏰ Check for overdue tax payments (daily at 9 AM)
crons.interval(
  "check overdue tax payments",
  { hours: 24 },
  internal.tax._checkOverduePayments,
  {}
);

export default crons;
