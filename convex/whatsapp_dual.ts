// ═══════════════════════════════════════════════════════════════════
// WHATSAPP DUAL — Barrel re-export
// All logic lives in convex/whatsapp_dual/*.ts
// This file preserves the api.whatsapp_dual.* path.
// ═══════════════════════════════════════════════════════════════════

export { seedWhatsAppDefaults, isWhatsAppEnabled, BUSINESS_NUMBER, BUSINESS_NAME, WHATSAPP_API_VERSION } from "./whatsapp_dual/seed";
export { getMasterKillSwitchStatus, getSystemStatus, toggleSystem, checkIsolation } from "./whatsapp_dual/status";
export { createSubscription, createSubscriptionInternal, getSubscriptions, getActiveSubscription, incrementUsage, checkExpiredSubscriptions } from "./whatsapp_dual/subscriptions";
export { sendWhatsAppMessage, logUsage, getUsageLogs, logRevenue } from "./whatsapp_dual/messaging";
export { agentSendMessage, enterpriseSendMessage, sendClientMessage, sendClientWhatsAppMessage } from "./whatsapp_dual/messaging_client";
export { getPricingTiers, getTierById, getMessageRates, togglePricingTier, getAllPricingTiers } from "./whatsapp_dual/pricing";
export { getBlacklist, addToBlacklist, removeFromBlacklist, isNumberBlocked, getAdCampaigns, createAdCampaign, getRevenueReport, getAgentList, formatNigerianPhone } from "./whatsapp_dual/sessions";
