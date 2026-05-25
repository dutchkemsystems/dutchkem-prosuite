import { internalAction, mutation, query } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { homeAgent } from "./home_agent";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createThread = mutation({
  args: {},
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const { threadId } = await homeAgent.agents[0].createThread(ctx, {
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
    const { messageId } = await homeAgent.agents[0].saveMessage(ctx, {
      threadId,
      prompt,
      userId: userId ?? undefined,
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.home_chat.generateResponse, {
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
    await homeAgent.streamWithFallback(
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
    const { threadId } = await homeAgent.agents[0].createThread(ctx, {});
    const { messageId } = await homeAgent.agents[0].saveMessage(ctx, {
      threadId,
      prompt,
      skipEmbeddings: true,
    });
    
    await homeAgent.streamWithFallback(ctx, threadId, messageId);
    
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    const lastMessage = paginated.page[0];
    return lastMessage?.text ?? "No response generated";
  },
});
