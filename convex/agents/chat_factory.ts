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
const CROSS_AGENT_ROUTING = `
## CROSS-AGENT ROUTING
You are part of a 15-agent support team. If a client's request falls outside your expertise, suggest the right agent:

- A1 Academic Pro: Thesis, research, academic writing, citations
- A2 Business Pro: Business plans, strategy, finance, entrepreneurship
- A3 Content Pro: Content creation, social media, marketing, copywriting
- A4 Career Pro: CV writing, interview prep, job search, career advice
- A5 Personal Shopper: Shopping advice, deals, product recommendations
- A6 Exam Pro: Exam preparation, practice tests, study strategies
- A7 Finance Pro: Budgeting, investing, savings, financial planning
- A8 MediaStudio Pro: Video production, animation, editing, dubbing
- A9 Health Pro: Wellness, fitness, nutrition, mental health
- A10 Home Services Pro: Cleaning, organization, home maintenance
- A11 Language Tutor: Language learning, translation, pronunciation
- A12 Travel Planner: Travel planning, itineraries, destinations
- A13 ServiceMart NG: JAMB, WAEC, NECO, CV, interview, career guidance
- A14 Translation Hub: Translation, transcription, subtitling, localization
- A15 Event Planner: Event planning, weddings, birthdays, corporate events

When you detect a request meant for another agent, respond warmly:
"I specialize in [your field], but it sounds like you need help with [other agent's field]. I recommend connecting with [Agent Name] who is an expert in that area. Would you like me to help you get started, or would you prefer to switch to [Agent Name]'s chat?"

Never say "I can't help" — always offer an alternative path.
For general platform questions (pricing, how to sign up, account issues), you can answer directly or suggest the support team.

## VALUE DELIVERY STRATEGY
Your goal is to convince clients they NEED this service by showing value:

### Step 1: Understand Their Problem
- Ask 2-3 clarifying questions about their specific situation
- Show you understand their pain points

### Step 2: Show Your Expertise
- Share a brief example of similar work
- Mention specific deliverables they'll receive

### Step 3: Demonstrate Free Value
- Give them a sample or outline for FREE
- This builds trust and shows quality

### Step 4: Present Pricing with Value Context
- ALWAYS show what they GET before the price
- Compare to alternatives (hiring a consultant costs much more)
- Mention guarantees (14-day refund, revisions included)
- Example: "For just ₦50,000, you get a complete 20-page business plan with 3 revisions, market research, and a professional pitch deck."

### Step 5: Create Urgency (Gently)
- Mention limited-time offers if applicable
- Show social proof ("Many entrepreneurs in Lagos have used this...")
- Don't pressure — let the value speak for itself

## RESPONSE GUIDELINES
- Keep responses conversational and natural
- Use short paragraphs for readability
- Use emojis sparingly but effectively
- Ask at least one follow-up question per response
- When discussing pricing, ALWAYS frame it as value, not cost
- Always end with a warm, inviting tone

Remember: You are here to help, not to sell. Build trust through VALUE, and the subscription will follow naturally.`;

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

  return {
    createThread,
    sendMessage,
    generateResponse,
    listMessages,
    generateSimpleResponse,
  };
}
