import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { components, internal } from "../_generated/api";
import { internalAction, mutation, query } from "../_generated/server";
import { buildComposioContext, AGENT_ID_MAP } from "../agent_runtime";
import {
  getPreSubscriptionResponse,
  getUpgradePrompt,
  getPreSubscriptionCountInternal,
  savePreSubscriptionExchange,
} from "../pre_subscription_handler";
import { getAgent, getAgentConfig } from "./registry";

const MAX_FREE_EXCHANGES = 3;

// Cross-agent routing awareness — appended to every agent's prompt
// CRITICAL: Keep under 500 chars. LLMs ignore long system prompts.
const CROSS_AGENT_ROUTING = `
RULES:
1. Be an expert in YOUR field. Give detailed, specific answers with examples.
2. Always show VALUE before cost — explain what they get, then pricing.
3. Give a FREE sample/outline to demonstrate quality.
4. Ask 1-2 follow-up questions per response.
5. If the request is for another agent, say: "I specialize in [X], but you need [Y]. Let me connect you with [Agent Name]."
6. Never say "I can't help" — always offer an alternative.
7. End every response with a warm, inviting question.
8. If the client writes in Yoruba, Hausa, Igbo, or Pidgin, respond in that language.`;

export function createChatModule(agentKey: string) {
  const config = getAgentConfig(agentKey);
  const composioMapKey = config.composioKey;

  const createThread = mutation({
    args: {},
    returns: v.object({ threadId: v.string() }),
    handler: async (ctx) => {
      const userId = await getAuthUserId(ctx);
      const agent = getAgent(agentKey);
      const { threadId } = await agent.agents[0].createThread(ctx, {
        userId: userId ?? undefined,
      });
      return { threadId };
    },
  });

  const sendMessage = mutation({
    args: { prompt: v.string(), threadId: v.string() },
    returns: v.string(),
    handler: async (ctx, { prompt, threadId }) => {
      const userId = await getAuthUserId(ctx);
      const agent = getAgent(agentKey);

      if (userId) {
        const sub = await ctx.runQuery(
          internal.subscription_guard.checkUserSubscription,
          { userId }
        );
        if (!sub.active) {
          const exchangeCount = await ctx.runQuery(
            internal.pre_subscription_handler
              .getPreSubscriptionCountInternal,
            { userId, agentId: config.agentId }
          );

          const { messageId } = await agent.agents[0].saveMessage(ctx, {
            threadId,
            prompt,
            userId,
            skipEmbeddings: true,
          });

          if (exchangeCount < MAX_FREE_EXCHANGES) {
            const response = getPreSubscriptionResponse(
              config.agentId,
              prompt
            );
            await (agent.agents[0] as any).answer(ctx, {
              threadId,
              promptMessageId: messageId,
              assistantId:
                (agent.agents[0] as any).agentId ?? config.fallbackName,
              text: response,
            });
            await ctx.runMutation(
              internal.pre_subscription_handler.savePreSubscriptionExchange,
              {
                userId,
                agentId: config.agentId,
                exchangeCount: exchangeCount + 1,
              }
            );
          } else {
            const upgradePrompt = getUpgradePrompt(
              config.agentId,
              exchangeCount
            );
            await (agent.agents[0] as any).answer(ctx, {
              threadId,
              promptMessageId: messageId,
              assistantId:
                (agent.agents[0] as any).agentId ?? config.fallbackName,
              text: upgradePrompt,
            });
          }
          return messageId;
        }
      }

      const composioAgentId = AGENT_ID_MAP[composioMapKey];
      let enhancedPrompt = prompt + CROSS_AGENT_ROUTING;
      if (composioAgentId) {
        const agentConfig = await ctx.runQuery(
          internal.agent_runtime.getAgentRuntimeConfig,
          { agentId: composioAgentId }
        );
        if (agentConfig.enhanced && agentConfig.toolkits.length > 0) {
          enhancedPrompt =
            prompt +
            buildComposioContext(agentConfig.toolkits, agentConfig.agentName);
        }
      }

      const { messageId } = await agent.agents[0].saveMessage(ctx, {
        threadId,
        prompt: enhancedPrompt,
        userId: userId ?? undefined,
        skipEmbeddings: true,
      });

      // Log interaction to support_orchestrator analytics (unified metrics)
      try {
        await ctx.runMutation(internal.support_orchestrator.logInteraction, {
          userId: userId || "anonymous",
          message: prompt.substring(0, 200),
          response: "[Agent Chat] Response queued",
          agentId: config.agentId,
          agentName: config.name,
          confidence: "high",
          routed: true,
          responseTimeMs: 0,
        });
      } catch (e) { /* Don't block on analytics */ }

      await ctx.scheduler.runAfter(0, (internal as any)[`${agentKey}_chat`].generateResponse, {
        threadId,
        promptMessageId: messageId,
      });
      return messageId;
    },
  });

  const generateResponse = internalAction({
    args: { promptMessageId: v.string(), threadId: v.string() },
    returns: v.null(),
    handler: async (ctx, { promptMessageId, threadId }) => {
      const userId = await getAuthUserId(ctx);
      const agent = getAgent(agentKey);
      await agent.streamWithFallback(
        ctx,
        threadId,
        promptMessageId,
        userId ?? undefined
      );
    },
  });

  const listMessages = query({
    args: {
      threadId: v.string(),
      paginationOpts: paginationOptsValidator,
      streamArgs: vStreamArgs,
    },
    returns: v.any(),
    handler: async (ctx, args) => {
      const streams = await syncStreams(ctx, components.agent, args);
      const paginated = await listUIMessages(ctx, components.agent, args);
      return { ...paginated, streams };
    },
  });

  const generateSimpleResponse = internalAction({
    args: { prompt: v.string() },
    returns: v.string(),
    handler: async (ctx, { prompt }) => {
      const agent = getAgent(agentKey);
      const config = getAgentConfig(agentKey);
      const { threadId } = await agent.agents[0].createThread(ctx, {});
      const { messageId } = await agent.agents[0].saveMessage(ctx, {
        threadId,
        prompt: prompt + CROSS_AGENT_ROUTING,
        skipEmbeddings: true,
      });

      await agent.streamWithFallback(ctx, threadId, messageId);

      const paginated = await listUIMessages(ctx, components.agent, {
        threadId,
        paginationOpts: { numItems: 1, cursor: null },
      });
      const lastMessage = paginated.page[0];
      return lastMessage?.text ?? "No response generated";
    },
  });

  // ─── CONVERSATION EXPORT ───
  const exportConversation = query({
    args: { threadId: v.string() },
    returns: v.any(),
    handler: async (ctx, { threadId }) => {
      const messages = await ctx.db
        .query("agent_messages")
        .filter((q) => q.eq(q.field("threadId"), threadId))
        .order("asc")
        .collect();

      const agentConfig = getAgentConfig(agentKey);
      return {
        agentName: agentConfig.name,
        agentId: agentConfig.agentId,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map((m) => ({
          role: m.role || "user",
          content: m.text || m.content || "",
          timestamp: m._creationTime,
        })),
      };
    },
  });

  return {
    createThread,
    sendMessage,
    generateResponse,
    listMessages,
    generateSimpleResponse,
    exportConversation,
  };
}
