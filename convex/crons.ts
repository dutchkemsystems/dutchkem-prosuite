import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";

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
  internal.payouts.runDailySweep,
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

// 🏛️ Freelancer Marketplace: Daily Platform-Fee Sweep (11 PM)
crons.cron(
  "daily platform fee sweep",
  "0 23 * * *",
  internal.marketplace.runDailyPlatformSweep,
  {}
);

// 💳 Subscriptions
crons.interval(
  "process subscription renewals",
  { hours: 1 },
  internal.payments.processSubscriptionRenewals,
  {}
);

// 📣 Social Media Engine
crons.cron(
  "social post morning",
  "0 9 * * *",
  internal.social.rotateSocialAgents,
  {}
);
crons.cron(
  "social post afternoon",
  "0 13 * * *",
  internal.social.rotateSocialAgents,
  {}
);
crons.cron(
  "social post evening",
  "0 18 * * *",
  internal.social.rotateSocialAgents,
  {}
);
crons.interval(
  "process scheduled social",
  { minutes: 10 },
  internal.social.processScheduledPosts,
  {}
);

// 🛡️ Guardian Watch (Self-Healing)
crons.interval(
  "full diagnosis",
  { hours: 1 },
  internal.guardian_watch.runFullDiagnosis,
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

// 🔄 Bi-Annual Auto-Upgrade Scheduler
crons.cron(
  "spring service upgrade",
  "0 2 1 5 *",
  api.bi_annual_upgrade.runBiAnnualUpgrade,
  {}
);
crons.cron(
  "fall service upgrade",
  "0 2 1 11 *",
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

export default crons;
