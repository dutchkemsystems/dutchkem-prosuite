import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";

const crons = cronJobs();

// 💰 Financials & Payouts
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

// 🏥 Model Health
crons.interval(
  "model health recovery",
  { minutes: 5 },
  internal.model_recovery.recoverModelHealth,
  {}
);

export default crons;
