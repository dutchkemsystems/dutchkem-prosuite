import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";

/**
 * RUNTIME AGENT CONFIGURATION
 * Bridges admin toggles → agent runtime behavior.
 * Called by *_chat.ts modules before sending messages.
 */

/** Agent ID mapping: chat module → Composio agent ID */
export const AGENT_ID_MAP: Record<string, string> = {
  academic_chat: "A1",
  business_chat: "A2",
  content_chat: "A3",
  career_chat: "A4",
  shopping_chat: "A5",
  exam_career_chat: "A6",
  finance_chat: "A7",
  video_chat: "A8",
  wellness_chat: "A9",
  home_chat: "A10",
  language_chat: "A11",
  travel_chat: "A12",
  certification_chat: "A13",
  translation_chat: "A14",
  event_chat: "A15",
};

/** Get agent's enhancement status and toolkit info for runtime use */
export const getAgentRuntimeConfig = internalQuery({
  args: { agentId: v.string() },
  returns: v.object({
    enhanced: v.boolean(),
    toolkits: v.array(v.string()),
    toolCount: v.number(),
    agentName: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("composio_agent_settings")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .first();

    if (!setting?.enabled) {
      return { enhanced: false, toolkits: [], toolCount: 0, agentName: undefined };
    }

    return {
      enhanced: true,
      toolkits: setting.tools ?? [],
      toolCount: setting.toolCount ?? 0,
      agentName: setting.agentName,
    };
  },
});

/** Build Composio context string to inject into agent prompt */
export function buildComposioContext(toolkits: string[], agentName?: string): string {
  if (!toolkits.length) return "";

  const toolkitDescriptions: Record<string, string> = {
    google_sheets: "Google Sheets (create/read/update spreadsheets)",
    google_drive: "Google Drive (file storage and sharing)",
    google_calendar: "Google Calendar (schedule events and reminders)",
    notion: "Notion (notes, databases, project management)",
    gmail: "Gmail (send/read emails)",
    slack: "Slack (team messaging)",
    hubspot: "HubSpot (CRM, sales pipelines)",
    salesforce: "Salesforce (CRM, lead management)",
    stripe: "Stripe (payment processing, invoicing)",
    wordpress: "WordPress (blog publishing)",
    twitter: "Twitter/X (social media posting)",
    linkedin: "LinkedIn (professional networking)",
    facebook: "Facebook (social media management)",
    instagram: "Instagram (visual content posting)",
    tiktok: "TikTok (short video content)",
    youtube: "YouTube (video publishing)",
    canva: "Canva (graphic design)",
    shopify: "Shopify (e-commerce)",
    quickbooks: "QuickBooks (accounting, invoicing)",
    twilio: "Twilio (SMS, phone calls)",
  };

  const activeTools = toolkits
    .map((t) => toolkitDescriptions[t] || t)
    .join(", ");

  return `\n\n[COMPOSIO TOOLS ACTIVE — ${agentName || "Agent"}]: You have access to: ${activeTools}. When the user requests actions on these platforms, provide specific step-by-step instructions, API details, or offer to execute via these integrations. Format tool-dependent outputs as structured data.`;
}

/** Public query for client dashboard to check agent status */
export const getAgentEnhancedStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const settings = await ctx.db.query("composio_agent_settings").collect();
    return settings.map((s) => ({
      agentId: s.agentId,
      enhanced: s.enabled,
      toolCount: s.toolCount,
      toolkits: s.tools,
    }));
  },
});
