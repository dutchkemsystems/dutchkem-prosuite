// Barrel re-exports for support_orchestrator module
// This file exists so Convex can resolve imports from ./support/*
// The actual API path is maintained by convex/support_orchestrator.ts

export { getAgentMetadata, AGENT_MAP, AGENT_LIST } from "./agents";
export { getBusinessHoursStatus } from "./business_hours";
export { getQueueStatus } from "./queue";
export { getAgentStates, getAgentLoad, _getAgentLoad, _getAllSystemConfig, _incrementAgentLoad, _decrementAgentLoad } from "./load_balancing";
export { getAutoResponseTemplates } from "./auto_responses";
export { processMessage } from "./process_message";
export { queueMessage, logInteraction, getSupportAnalytics, getRecentInteractions, getPendingEscalations, updateModelConfig, toggleAgent, getAgentPerformance } from "./interactions";
export { escalateInteraction, resolveEscalation, assignEscalation, addEscalationResponse, getActiveEscalations } from "./escalations";
export { getOrchestratorStatus } from "./status";
