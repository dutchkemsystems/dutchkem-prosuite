import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { ActionCtx } from "./_generated/server";

/**
 * Cheap classification using Llama 3 8B (Attempt 3 model)
 * Used to save NVIDIA NIM credits for complex tasks.
 */
export async function classifyTask(_ctx: ActionCtx, prompt: string): Promise<string> {
  const nvidia = createOpenAI({
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  try {
    const { text } = await generateText({
      model: nvidia.chat("meta/llama-3-8b-instruct"),
      prompt: `Classify the following user request into one of these categories: 
      [GENERAL, BILLING, TECHNICAL, PROJECT_REQUEST, SECURITY]. 
      Return only the category name in uppercase.
      
      User request: "${prompt}"`,
    });
    return text.trim().toUpperCase();
  } catch (err) {
    console.error("Classification failed:", err);
    return "GENERAL";
  }
}
