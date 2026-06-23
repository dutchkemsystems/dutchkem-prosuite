import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { components, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { agentTools } from "./agent_tools";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const nvidia = createOpenAI({
  apiKey: process.env.NVIDIA_NIM_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export const FALLBACK_CHAIN = [
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-70b-instruct",
  "meta-llama/llama-3-8b-instruct"
];

const NVIDIA_MODELS = {
  "meta-llama/llama-3.3-70b-instruct": "meta/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-70b-instruct": "meta/llama-3.1-70b-instruct",
  "meta-llama/llama-3-8b-instruct": "meta/llama-3-8b-instruct",
  "mistralai/mixtral-8x22b-instruct": "mistralai/mixtral-8x22b-instruct-v0.1"
};

export function createReliableAgent(name: string, instructions: string, primaryModel: string) {
  const modelChain = [primaryModel, ...FALLBACK_CHAIN.filter(m => m !== primaryModel)];
  
  const agents = modelChain.map((modelId) => {
    // If we have an NVIDIA key, prefer using it directly for these models
    const isNvidiaAvailable = !!process.env.NVIDIA_NIM_API_KEY;
    const nvidiaModelId = NVIDIA_MODELS[modelId as keyof typeof NVIDIA_MODELS];
    
    const languageModel = (isNvidiaAvailable && nvidiaModelId) 
      ? nvidia.chat(nvidiaModelId)
      : openrouter.chat(modelId);

    return new Agent(components.agent, {
      name: `${name} [${modelId.split('/').pop()}]`,
      instructions,
      languageModel: languageModel,
      maxSteps: 5,
      tools: agentTools,
    });
  });

  return {
    agents,
    async streamWithFallback(
      ctx: ActionCtx, 
      threadId: string, 
      promptMessageId: string,
      userId?: string
    ) {
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const modelId = modelChain[i];
        
        try {
          console.log(`[Guardian AI] Attempt ${i + 1}: Using ${modelId} for ${name}`);
          
          const result = await Promise.race([
            agent.streamText(
              ctx,
              { threadId },
              { promptMessageId },
              { saveStreamDeltas: { throttleMs: 200, chunking: "word" } }
            ),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Timeout after 15s")), 15000)
            )
          ]) as any;

          await result.consumeStream();
          
          if (i > 0) {
            await ctx.runMutation(internal.guardian.logSecurityEvent, {
              userId: userId as any,
              action: "model_fallback_success",
              details: `${name} recovered using fallback ${i}: ${modelId}`,
              ip: "system",
              userAgent: "Guardian AI Auto-Recovery",
            });
          }
          return;

        } catch (error: any) {
          console.error(`[Guardian AI] Attempt ${i + 1} failed for ${modelId}:`, error.message);
          
          await ctx.runMutation(internal.guardian.logSecurityEvent, {
            userId: userId as any,
            action: "model_failure",
            details: `${name} failed on ${modelId}: ${error.message}`,
            ip: "system",
            userAgent: "Guardian AI Monitor",
          });
          
          continue;
        }
      }
      
      console.error(`[Guardian AI] All ${agents.length} models failed for ${name}`);
      throw new Error(`All AI models failed for ${name}. Please try again later.`);
    }
  };
}
