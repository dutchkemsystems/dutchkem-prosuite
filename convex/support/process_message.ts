import { v } from "convex/values";
import { action } from "../_generated/server";
import { AGENT_MAP } from "./agents";
import { isWithinBusinessHours, getBusinessHoursMessage } from "./business_hours";
import { fetchAgentLoad, incrementAgentLoad, decrementAgentLoad, selectLeastBusy, detectSentiment } from "./load_balancing";
import { matchAutoResponse } from "./auto_responses";
import { classifyIntent, getFallbackResponse } from "./intent";

async function getQueuePosition(ctx: any): Promise<number> {
  const allConfig = await ctx.runQuery(
    (await import("../_generated/api")).internal.support.load_balancing._getAllSystemConfig
  );
  const configMap = new Map(allConfig.map((c: any) => [c.key, c.value]));

  let totalActive = 0;
  const agentIds = ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15"];
  for (const id of agentIds) {
    totalActive += (configMap.get(`agent_active_conversations_${id}`) as number) || 0;
  }

  return Math.max(0, totalActive - 50 + 1);
}

// ═══════════════════════════════════════════════════════════════════
// ACTION: Process message with LLM routing
// ═══════════════════════════════════════════════════════════════════
export const processMessage = action({
  args: {
    message: v.string(),
    userId: v.optional(v.string()),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.string(),
          content: v.string(),
        })
      )
    ),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const history = args.conversationHistory || [];
    const startTime = Date.now();
    const userId = args.userId || "anonymous";

    const agentStates = await ctx.runQuery(
      (await import("../_generated/api")).api.support_orchestrator.getAgentStates
    );
    const agentLoad = await fetchAgentLoad(ctx);

    const withinHours = isWithinBusinessHours();
    const hoursMessage = getBusinessHoursMessage();

    const queuePosition = await getQueuePosition(ctx);
    if (queuePosition > 0) {
      const queueId = await ctx.runMutation(
        (await import("../_generated/api")).api.support_orchestrator.queueMessage,
        {
          userId,
          message: args.message,
          conversationHistory: history,
          position: queuePosition,
        }
      );
      return {
        success: true,
        queued: true,
        queuePosition,
        estimatedWait: `${queuePosition * 30} seconds`,
        response: withinHours
          ? `You're in position ${queuePosition} in our support queue. Estimated wait: ~${queuePosition * 30} seconds. Our team is handling other requests and will get to you shortly!`
          : `You're in position ${queuePosition} in our support queue. ${hoursMessage}`,
        agentId: "QUEUE",
        agentName: "Support Queue",
        icon: "⏳",
        routed: false,
        confidence: "none",
        responseTimeMs: Date.now() - startTime,
        shouldPromptLogin: false,
      };
    }

    const templateMatch = matchAutoResponse(args.message);
    if (templateMatch.template) {
      const template = templateMatch.template;

      await ctx.runMutation(
        (await import("../_generated/api")).api.support_orchestrator.logInteraction,
        {
          userId,
          message: args.message,
          response: template.response,
          agentId: template.agentId,
          agentName: AGENT_MAP[template.agentId]?.name || "Auto-Response",
          confidence: templateMatch.confidence,
          routed: false,
          sentiment: detectSentiment(args.message),
          responseTimeMs: Date.now() - startTime,
        }
      );

      return {
        success: true,
        response: template.response,
        agentId: template.agentId,
        agentName: AGENT_MAP[template.agentId]?.name || "Auto-Response",
        icon: AGENT_MAP[template.agentId]?.icon || "⚡",
        routed: false,
        confidence: templateMatch.confidence,
        responseTimeMs: Date.now() - startTime,
        shouldPromptLogin: false,
        autoResponse: true,
        category: template.category,
      };
    }

    const intent = await classifyIntent(args.message, history);
    const sentiment = detectSentiment(args.message);

    let selectedAgentId = intent.agentId;
    if (intent.agentId !== "GENERAL" && AGENT_MAP[intent.agentId]) {
      const primaryLoad = agentLoad[intent.agentId] || 0;
      if (primaryLoad >= 3) {
        const alternatives = Object.keys(AGENT_MAP).filter((id) => id !== intent.agentId);
        const bestAlternative = selectLeastBusy(alternatives, agentLoad, agentStates);
        if ((agentLoad[bestAlternative] || 0) < primaryLoad) {
          selectedAgentId = bestAlternative;
        }
      }
    }

    if (intent.agentId === "GENERAL") {
      let response: string;
      try {
        response = await (await import("./intent")).callNVIDIA(
          "meta/llama-3.1-8b-instruct",
          "You are a friendly customer support agent for Dutchkem Ventures Prosuite NG+. Help with general questions about the platform, pricing, features, and getting started. Be warm, professional, use emojis. If the question is about a specific service, suggest the right agent.",
          args.message
        );
      } catch {
        response = getFallbackResponse(args.message);
      }

        const interactionId = await ctx.runMutation(
          (await import("../_generated/api")).api.support_orchestrator.logInteraction,
          {
            userId,
            message: args.message,
            response,
            agentId: "GENERAL",
            agentName: "General Support",
            confidence: intent.confidence,
            routed: false,
            responseTimeMs: Date.now() - startTime,
          }
        );

        const escalationResult = await ctx.runMutation(
          (await import("../_generated/api")).api.support_auto_escalation.checkAndEscalate,
          {
            interactionId: interactionId as any,
            confidence: intent.confidence,
            agentId: "GENERAL",
            message: args.message,
          }
        );

        if (escalationResult.escalated) {
          console.log(`Auto-escalated: ${escalationResult.reason}`);
        }

        return {
          success: true,
          response,
          agentId: "GENERAL",
          agentName: "General Support",
          icon: "💬",
          routed: false,
          confidence: intent.confidence,
          responseTimeMs: Date.now() - startTime,
          shouldPromptLogin: false,
        };
    }

    try {
      await incrementAgentLoad(ctx, selectedAgentId);

      const result: any = await ctx.runAction(
        (await import("../_generated/api")).api.customer_support.generateSupportResponse,
        {
          agentId: selectedAgentId,
          message: args.message,
          conversationHistory: history,
        }
      );

      const agentInfo = AGENT_MAP[selectedAgentId];
      const responseText: string = result.message || "I'm here to help! Could you rephrase your question?";
      const responseTimeMs = Date.now() - startTime;

      const interactionId = await ctx.runMutation(
        (await import("../_generated/api")).api.support_orchestrator.logInteraction,
        {
          userId,
          message: args.message,
          response: responseText,
          agentId: selectedAgentId,
          agentName: agentInfo?.name || "Support",
          confidence: intent.confidence,
          routed: true,
          responseTimeMs,
        }
      );

      await decrementAgentLoad(ctx, selectedAgentId);

      if (interactionId) {
        const escalationResult = await ctx.runMutation(
          (await import("../_generated/api")).api.support_auto_escalation.checkAndEscalate,
          {
            interactionId,
            confidence: intent.confidence,
            agentId: intent.agentId,
            message: args.message,
          }
        );
        if (escalationResult.escalated) {
          console.log(`Auto-escalated: ${escalationResult.reason}`);
        }
      }

      const repetitionCheck = await ctx.runMutation(
        (await import("../_generated/api")).api.support_repetition_detector.checkRepetition,
        {
          agentId: selectedAgentId,
          message: args.message,
          response: responseText,
        }
      );

      let finalResponse: string = responseText;
      if (repetitionCheck.isRepetitive) {
        const retryResult: any = await ctx.runAction(
          (await import("../_generated/api")).api.customer_support.generateSupportResponse,
          {
            agentId: selectedAgentId,
            message: `IMPORTANT: Do NOT repeat previous answers. Provide a fresh, different response to: ${args.message}`,
          }
        );
        if (retryResult.message) {
          finalResponse = retryResult.message;
        }
      }

      const shouldPromptLogin = finalResponse.includes("---LOGIN_PROMPT---");
      let cleanedResponse: string = finalResponse;
      if (shouldPromptLogin) {
        cleanedResponse = finalResponse.replace(/---LOGIN_PROMPT---[\s\S]*?\[\/LOGIN_PROMPT\]/g, "").trim();
      }

      return {
        success: true,
        response: cleanedResponse,
        agentId: intent.agentId,
        agentName: agentInfo?.name || "Support",
        icon: agentInfo?.icon || "💬",
        routed: true,
        confidence: intent.confidence,
        responseTimeMs,
        shouldPromptLogin,
      };
    } catch (error: any) {
      console.error(`[Orchestrator] Agent ${intent.agentId} failed:`, error.message);
      return {
        success: false,
        response: "I apologize, but our support system is temporarily unavailable. Please try again later.",
        agentId: intent.agentId,
        agentName: AGENT_MAP[intent.agentId]?.name || "System",
        routed: false,
        confidence: "low",
        shouldPromptLogin: false,
      };
    }
  },
});
