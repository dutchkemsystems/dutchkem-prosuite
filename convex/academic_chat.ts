import { internalAction, mutation, query } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { academicAgent } from "./academic_agent";
import { getAuthUserId } from "@convex-dev/auth/server";
import { KDP_REPLY } from "./kdp_constants";

export const createThread = mutation({
  args: {},
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    // Use the first agent in the suite to create the thread
    const { threadId } = await academicAgent.agents[0].createThread(ctx, {
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

    if (prompt === "E-Book Publishing") {
      const { messageId } = await academicAgent.agents[0].saveMessage(ctx, {
        threadId,
        prompt,
        userId: userId ?? undefined,
        skipEmbeddings: true,
      });
      
      // Save the fixed assistant response
      await components.agent.answer(ctx, {
        threadId,
        promptMessageId: messageId,
        assistantId: academicAgent.agents[0].id,
        text: KDP_REPLY,
      });
      
      return messageId;
    }

    const { messageId } = await academicAgent.agents[0].saveMessage(ctx, {
      threadId,
      prompt,
      userId: userId ?? undefined,
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.academic_chat.generateResponse, {
      threadId,
      promptMessageId: messageId,
    });
    return messageId;
  },
});

export const generateResponse = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string() },
  handler: async (ctx, { promptMessageId, threadId }) => {
    const userId = await getAuthUserId(ctx);
    await academicAgent.streamWithFallback(
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
    const { threadId } = await academicAgent.agents[0].createThread(ctx, {});
    const { messageId } = await academicAgent.agents[0].saveMessage(ctx, {
      threadId,
      prompt,
      skipEmbeddings: true,
    });
    
    await academicAgent.streamWithFallback(ctx, threadId, messageId);
    
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    const lastMessage = paginated.page[0];
    return lastMessage?.text ?? "No response generated";
  },
});
