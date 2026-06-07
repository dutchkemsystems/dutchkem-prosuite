import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { languageAgent } from "./language_agent";
import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";

export const createThread = mutation({
  args: {},
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const { threadId } = await languageAgent.agents[0].createThread(ctx, {
      userId: userId ?? undefined,
    });
    return { threadId };
  },
});

export const sendMessage = mutation({
  args: { prompt: v.string(), threadId: v.string() },
  returns: v.string(),
  handler: async (ctx, { prompt, threadId }) => {
    const userId = await getAuthUserId(ctx);
    // SUBSCRIPTION CHECK — require active plan before AI processing
    if (userId) {
      const sub = await ctx.runQuery(internal.subscription_guard.checkUserSubscription, { userId });
      if (!sub.active) {
        const { messageId } = await languageAgent.agents[0].saveMessage(ctx, {
          threadId,
          prompt,
          userId,
          skipEmbeddings: true,
        });
        await (languageAgent.agents[0] as any).answer(ctx, {
          threadId,
          promptMessageId: messageId,
          assistantId: (languageAgent.agents[0] as any).agentId ?? "language-agent",
          text: "⚠️ Active subscription required. Please subscribe at https://dutchkem-prosuite-app.vercel.app/dashboard to use this agent.",
        });
        return messageId;
      }
    }
    const { messageId } = await languageAgent.agents[0].saveMessage(ctx, {
      threadId,
      prompt,
      userId: userId ?? undefined,
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.language_chat.generateResponse, {
      threadId,
      promptMessageId: messageId,
    });
    return messageId;
  },
});

export const generateResponse = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { promptMessageId, threadId }) => {
    const userId = await getAuthUserId(ctx);
    await languageAgent.streamWithFallback(
      ctx,
      threadId,
      promptMessageId,
      userId ?? undefined
    );
  },
});

export const listMessages = query({
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

export const generateSimpleResponse = internalAction({
  args: { prompt: v.string() },
  returns: v.string(),
  handler: async (ctx, { prompt }) => {
    const { threadId } = await languageAgent.agents[0].createThread(ctx, {});
    const { messageId } = await languageAgent.agents[0].saveMessage(ctx, {
      threadId,
      prompt,
      skipEmbeddings: true,
    });
    
    await languageAgent.streamWithFallback(ctx, threadId, messageId);
    
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    const lastMessage = paginated.page[0];
    return lastMessage?.text ?? "No response generated";
  },
});
