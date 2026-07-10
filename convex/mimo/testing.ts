import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const testAgentChat = mutation({
  args: {
    adminToken: v.optional(v.string()),
    agentId: v.string(),
    question: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const agentConfig = AGENT_TEST_CONFIG.find((a) => a.id === args.agentId);
    if (!agentConfig) throw new Error(`Agent ${args.agentId} not found`);

    const startTime = Date.now();

    try {
      // Get the chat module
      const chatModule = await import(`./${agentConfig.module}`);
      
      // Create a thread
      const threadResult = await chatModule.createThread.handler(ctx, {});
      const threadId = threadResult.threadId;

      // Send the message
      const messageId = await chatModule.sendMessage.handler(ctx, {
        prompt: args.question,
        threadId,
      });

      const duration = Date.now() - startTime;

      // Log the test
      await ctx.db.insert("health_logs", {
        component: `agent_${args.agentId}`,
        status: "healthy",
        details: `Chat test passed: ${args.question.substring(0, 50)}`,
        severity: "low",
        timestamp: Date.now(),
        responseTimeMs: duration,
      });

      return {
        success: true,
        agentId: args.agentId,
        agentName: agentConfig.name,
        question: args.question,
        threadId,
        messageId,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log the failure
      await ctx.db.insert("security_events", {
        eventType: "agent_chat_failure",
        description: `Agent ${args.agentId} chat test failed: ${error.message}`,
        severity: "medium",
        timestamp: Date.now(),
        blocked: false,
      });

      return {
        success: false,
        agentId: args.agentId,
        agentName: agentConfig.name,
        question: args.question,
        error: error.message,
        duration,
      };
    }
  },
});

/** Test all agents with sample questions */
export const testAllAgents = mutation({
  args: {
    adminToken: v.optional(v.string()),
    questionsPerAgent: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const questionsPerAgent = args.questionsPerAgent || 6;
    const results: Array<{
      agentId: string;
      agentName: string;
      passed: number;
      failed: number;
      avgDuration: number;
      questions: Array<{
        question: string;
        success: boolean;
        duration: number;
        error?: string;
      }>;
    }> = [];

    let totalPassed = 0;
    let totalFailed = 0;

    for (const agentConfig of AGENT_TEST_CONFIG) {
      const agentResult = {
        agentId: agentConfig.id,
        agentName: agentConfig.name,
        passed: 0,
        failed: 0,
        avgDuration: 0,
        questions: [] as Array<{
          question: string;
          success: boolean;
          duration: number;
          error?: string;
        }>,
      };

      const questions = agentConfig.questions.slice(0, questionsPerAgent);

      for (const question of questions) {
        const startTime = Date.now();

        try {
          const chatModule = await import(`./${agentConfig.module}`);
          const threadResult = await chatModule.createThread.handler(ctx, {});
          const threadId = threadResult.threadId;
          const messageId = await chatModule.sendMessage.handler(ctx, {
            prompt: question,
            threadId,
          });

          const duration = Date.now() - startTime;
          agentResult.passed++;
          totalPassed++;
          agentResult.questions.push({
            question,
            success: true,
            duration,
          });
        } catch (error: any) {
          const duration = Date.now() - startTime;
          agentResult.failed++;
          totalFailed++;
          agentResult.questions.push({
            question,
            success: false,
            duration,
            error: error.message,
          });
        }
      }

      agentResult.avgDuration = Math.round(
        agentResult.questions.reduce((sum, q) => sum + q.duration, 0) /
          agentResult.questions.length
      );

      results.push(agentResult);
    }

    // Log summary
    await ctx.db.insert("health_logs", {
      component: "agent_chat_test",
      status: totalFailed === 0 ? "healthy" : "degraded",
      details: `Tested ${AGENT_TEST_CONFIG.length} agents: ${totalPassed} passed, ${totalFailed} failed`,
      severity: totalFailed === 0 ? "low" : "medium",
      timestamp: Date.now(),
      responseTimeMs: results.reduce((sum, r) => sum + r.avgDuration, 0) / results.length,
    });

    return {
      success: true,
      totalAgents: AGENT_TEST_CONFIG.length,
      totalPassed,
      totalFailed,
      successRate: Math.round((totalPassed / (AGENT_TEST_CONFIG.length * questionsPerAgent)) * 100),
      results,
    };
  },
});

/** Get agent chat test results */
export const getAgentTestResults = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    // Get recent health logs for agent tests
    const agentLogs = await ctx.db
      .query("mimo_health_logs")
      .collect();

    const agentTestLogs = agentLogs.filter(
      (log) => log.component.startsWith("agent_") || log.component === "agent_chat_test"
    );

    // Get agent services for status
    const agentServices = await ctx.db.query("agent_services").collect();

    return {
      testLogs: agentTestLogs.slice(-50),
      agentServices,
      summary: {
        totalAgents: 15,
        recentTests: agentTestLogs.length,
        lastTestAt: agentTestLogs.length > 0
          ? agentTestLogs[agentTestLogs.length - 1].timestamp
          : null,
      },
    };
  },
});

/** Get test configuration */
export const getAgentTestConfig = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return AGENT_TEST_CONFIG.map((agent) => ({
      id: agent.id,
      name: agent.name,
      module: agent.module,
      questionCount: agent.questions.length,
    }));
  },
});
