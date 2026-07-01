import { createReliableAgent } from "../ai_factory";
import { AGENT_CONFIGS, type AgentConfig } from "./config";

type AgentRegistry = Record<string, ReturnType<typeof createReliableAgent>>;

function buildRegistry(): AgentRegistry {
  const registry: AgentRegistry = {};
  for (const config of AGENT_CONFIGS) {
    registry[config.key] = createReliableAgent(
      config.name,
      config.prompt,
      config.model
    );
  }
  return registry;
}

export const agentRegistry = buildRegistry();

export function getAgent(key: string) {
  const agent = agentRegistry[key];
  if (!agent) throw new Error(`Unknown agent: ${key}`);
  return agent;
}

export function getAgentConfig(key: string): AgentConfig {
  const config = AGENT_CONFIGS.find((c) => c.key === key);
  if (!config) throw new Error(`Unknown agent config: ${key}`);
  return config;
}
