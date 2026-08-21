// ═══════════════════════════════════════════════════════════════════
// SUPPORT ORCHESTRATOR — Barrel re-export
// All logic lives in convex/support/*.ts
// This file preserves the api.support_orchestrator.* path.
// ═══════════════════════════════════════════════════════════════════

export { getAgentMetadata, AGENT_MAP, AGENT_LIST } from "./support/agents";
export { getBusinessHoursStatus } from "./support/business_hours";
export { getQueueStatus } from "./support/queue";
export { getAgentStates, getAgentLoad, _getAgentLoad, _getAllSystemConfig, _incrementAgentLoad, _decrementAgentLoad } from "./support/load_balancing";
export { getAutoResponseTemplates } from "./support/auto_responses";
export { processMessage } from "./support/process_message";
export { queueMessage, logInteraction, getSupportAnalytics, getRecentInteractions, getPendingEscalations, updateModelConfig, toggleAgent, getAgentPerformance } from "./support/interactions";
export { escalateInteraction, resolveEscalation, assignEscalation, addEscalationResponse, getActiveEscalations } from "./support/escalations";
export { getOrchestratorStatus } from "./support/status";
