// agents.test.ts
// Tests for agents schema module
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("Agents Schema Module", () => {
  test("ai_agents table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    // Insert a test agent
    const agentId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("ai_agents", {
        name: "Test Agent",
        description: "A test agent for unit tests",
        type: "test",
      });
    });

    expect(agentId).toBeDefined();

    // Query the agent
    const agent = await t.run(async (ctx: any) => {
      return await ctx.db.get(agentId);
    });

    expect(agent).toBeDefined();
    expect(agent?.name).toBe("Test Agent");
    expect(agent?.type).toBe("test");
  });

  test("agent_conversations table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    // Create a user
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "chatuser@example.com",
        name: "Chat User",
        role: "user",
      });
    });

    // Create an agent
    const agentId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("ai_agents", {
        name: "Chat Agent",
        description: "An agent for testing conversations",
        type: "chat",
      });
    });

    // Create a conversation
    const conversationId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("agent_conversations", {
        userId,
        agentId,
        title: "Test Conversation",
      });
    });

    expect(conversationId).toBeDefined();

    // Query the conversation
    const conversation = await t.run(async (ctx: any) => {
      return await ctx.db.get(conversationId);
    });

    expect(conversation).toBeDefined();
    expect(conversation?.title).toBe("Test Conversation");
  });

  test("agent_messages table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    // Create a user
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "msguser@example.com",
        name: "Message User",
        role: "user",
      });
    });

    // Create an agent
    const agentId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("ai_agents", {
        name: "Message Agent",
        description: "An agent for testing messages",
        type: "messaging",
      });
    });

    // Create a conversation
    const conversationId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("agent_conversations", {
        userId,
        agentId,
        title: "Message Test Conversation",
      });
    });

    // Create a message
    const messageId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("agent_messages", {
        conversationId,
        role: "user",
        content: "Hello, agent!",
      });
    });

    expect(messageId).toBeDefined();

    // Query the message
    const message = await t.run(async (ctx: any) => {
      return await ctx.db.get(messageId);
    });

    expect(message).toBeDefined();
    expect(message?.content).toBe("Hello, agent!");
    expect(message?.role).toBe("user");
  });

  test("agent_services table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    // Insert a service
    const serviceId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("agent_services", {
        agent_id: "A1",
        name: "Academic Writing",
        description: "Professional academic writing assistance",
        icon: "📝",
        added_at: Date.now(),
        category: "academic",
      });
    });

    expect(serviceId).toBeDefined();

    // Query the service
    const service = await t.run(async (ctx: any) => {
      return await ctx.db.get(serviceId);
    });

    expect(service).toBeDefined();
    expect(service?.agent_id).toBe("A1");
    expect(service?.name).toBe("Academic Writing");
  });
});
