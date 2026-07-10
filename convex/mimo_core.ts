// convex/mimo_core.ts — barrel re-export (original was 2799 lines, now split into 8 modules)
// All exports preserved for backward compatibility

export { getCoreState } from "./mimo/core";
export { diagnose } from "./mimo/core";
export { heal, forceHeal, securityScan, verify } from "./mimo/healing";
export { deploy, createAgent, suspendAgent, deleteAgent, alterAgent, listAgents, getDashboardStats } from "./mimo/agents";
export { listHealthLogs, listSecurityEvents, listCommandHistory, listDeployments, listAuditLogs } from "./mimo/agents";
export { manualFix, listAutoHealRuns, getAutoHealRunDetail, getAutoHealStats } from "./mimo/autoheal";
export { getSecurityDashboard, blockIP, unblockIP, logThreat } from "./mimo/autoheal";
export { selfUpdate, cronSelfUpdate } from "./mimo/cron";
export { listCronJobs, getCronJobDetail, getCronExecutionHistory, getCronStats } from "./mimo/cron";
export { triggerCronJob, completeCronExecution, toggleCronJob, seedCronJobs, getCronCategories } from "./mimo/cron";
export { getPerformanceMetrics, getApiCosts, getDatabaseStats, getDatabaseIndexes } from "./mimo/monitoring";
export { getEnvironmentConfig, getRecentLogs, getNotifications, getNotificationPreferences, getApiHealth } from "./mimo/monitoring";
export { testAgentChat, testAllAgents, getAgentTestResults, getAgentTestConfig } from "./mimo/testing";
