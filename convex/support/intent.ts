import { AGENT_MAP, AGENT_LIST } from "./agents";

// ═══════════════════════════════════════════════════════════════════
// LLM CALL HELPER
// ═══════════════════════════════════════════════════════════════════
export async function callNVIDIA(model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY_NOT_SET");

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 100,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`NVIDIA API error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

// Fallback response when LLM is unavailable
export function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();

  // Pricing questions
  if (lower.includes("price") || lower.includes("cost") || lower.includes("plan") || lower.includes("subscription")) {
    return "We have flexible plans starting from ₦5,000/month! Our Starter plan gives you access to 3 AI agents, Pro gives you 10, and Business gives you all 15 agents with priority support. Would you like to know more about any specific plan? 💰";
  }

  // Feature questions
  if (lower.includes("feature") || lower.includes("what can") || lower.includes("how does") || lower.includes("agent")) {
    return "Dutchkem Prosuite NG+ offers 15 specialized AI agents covering academic writing, business consulting, content creation, career coaching, finance, video production, and more! Each agent is an expert in their field. Which area interests you most? 🤖";
  }

  // Getting started
  if (lower.includes("start") || lower.includes("sign up") || lower.includes("register") || lower.includes("how to")) {
    return "Getting started is easy! Visit our registration page, choose a plan that fits your needs, and you'll be up and running in minutes. Our AI agents are ready to help 24/7. Would you like me to guide you through the setup? 🚀";
  }

  // Complaints
  if (lower.includes("problem") || lower.includes("issue") || lower.includes("error") || lower.includes("bug")) {
    return "I'm sorry to hear you're experiencing issues. Our support team is here to help! Could you describe what's happening in more detail? I'll make sure we get this resolved quickly. 💪";
  }

  // General greeting
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("good")) {
    return "Hello! 👋 Welcome to Dutchkem Prosuite NG+. I'm here to help with any questions about our AI platform. Whether it's pricing, features, or getting started — I've got you covered! What would you like to know? 😊";
  }

  // Default
  return "Thank you for your message! I'm here to help with anything about Dutchkem Prosuite NG+ — from our 15 AI agents to pricing and features. Could you tell me more about what you're looking for? 😊";
}

// ═══════════════════════════════════════════════════════════════════
// INTENT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════
export async function classifyIntent(message: string, history: Array<{ role: string; content: string }>): Promise<{ agentId: string; confidence: string }> {
  const contextSnippet = history.slice(-3).map((h) => `${h.role}: ${h.content}`).join("\n");

  const classificationPrompt = `You are a support request classifier. Your ONLY job is to determine which agent should handle this customer message.

Available Agents:
${AGENT_LIST}
- GENERAL: General platform questions (pricing, features, how to get started, complaints)

Customer Message: "${message}"
${contextSnippet ? `Previous context: ${contextSnippet}` : ""}

Respond with ONLY the agent ID (e.g. A1, A7, GENERAL). Nothing else.`;

  // Try primary model (fast 8B)
  try {
    const response = await callNVIDIA("meta/llama-3.1-8b-instruct", classificationPrompt, message);
    const agentId = response.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (AGENT_MAP[agentId]) return { agentId, confidence: "high" };
    if (agentId === "GENERAL") return { agentId: "GENERAL", confidence: "medium" };
  } catch {}

  // Try fallback model
  try {
    const response = await callNVIDIA("meta/llama-3-8b-instruct", classificationPrompt, message);
    const agentId = response.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (AGENT_MAP[agentId]) return { agentId, confidence: "high" };
    if (agentId === "GENERAL") return { agentId: "GENERAL", confidence: "medium" };
  } catch {}

  return { agentId: "GENERAL", confidence: "low" };
}
