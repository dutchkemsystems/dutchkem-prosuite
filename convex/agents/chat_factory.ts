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
      let enhancedPrompt = prompt;
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
      const { threadId } = await agent.agents[0].createThread(ctx, {});
      const { messageId } = await agent.agents[0].saveMessage(ctx, {
        threadId,
        prompt,
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

  return {
    createThread,
    sendMessage,
    generateResponse,
    listMessages,
    generateSimpleResponse,
  };
}
