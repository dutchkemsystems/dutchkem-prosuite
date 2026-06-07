import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const createNode = mutation({
  args: { adminToken: v.string(), nodeType: v.string(), label: v.string(), description: v.string(), metadata: v.any() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const nodeId = `node-${Date.now()}`;
    const id = await ctx.db.insert("knowledge_graph_nodes", {
      nodeId, nodeType: args.nodeType, label: args.label, description: args.description,
      metadata: args.metadata, createdBy: "admin", createdAt: Date.now(), updatedAt: Date.now(),
    });
    return { success: true, nodeId, id };
  },
});

export const createEdge = mutation({
  args: { adminToken: v.string(), sourceNodeId: v.string(), targetNodeId: v.string(), relationship: v.string(), weight: v.number(), metadata: v.any() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const edgeId = `edge-${Date.now()}`;
    const id = await ctx.db.insert("knowledge_graph_edges", {
      edgeId, ...args, createdAt: Date.now(),
    });
    return { success: true, edgeId, id };
  },
});

export const queryGraph = mutation({
  args: { adminToken: v.string(), queryText: v.string(), nodeType: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const start = Date.now();
    let nodes: any[] = await ctx.db.query("knowledge_graph_nodes").take(500);
    if (args.nodeType) nodes = nodes.filter((n) => n.nodeType === args.nodeType);
    const nodeIds = new Set(nodes.map((n) => n.nodeId));
    const edges = (await ctx.db.query("knowledge_graph_edges").take(1000)).filter(
      (e) => nodeIds.has(e.sourceNodeId) || nodeIds.has(e.targetNodeId)
    );
    const executionMs = Date.now() - start;
    await ctx.db.insert("knowledge_graph_queries", {
      queryText: args.queryText, resultCount: nodes.length, executionMs, queriedBy: "admin", createdAt: Date.now(),
    });
    return { nodes, edges, executionMs, nodeCount: nodes.length, edgeCount: edges.length };
  },
});

export const getAllNodes = query({
  args: { nodeType: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("knowledge_graph_nodes");
    if (args.nodeType) q = q.withIndex("by_type", (q2: any) => q2.eq("nodeType", args.nodeType!));
    return await q.order("desc").take(args.limit ?? 100);
  },
});

export const getEdges = query({
  args: { nodeId: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.nodeId) {
      const sourceEdges = await ctx.db.query("knowledge_graph_edges").withIndex("by_source", (q) => q.eq("sourceNodeId", args.nodeId!)).take(args.limit ?? 50);
      const targetEdges = await ctx.db.query("knowledge_graph_edges").withIndex("by_target", (q) => q.eq("targetNodeId", args.nodeId!)).take(args.limit ?? 50);
      return [...sourceEdges, ...targetEdges];
    }
    return await ctx.db.query("knowledge_graph_edges").order("desc").take(args.limit ?? 100);
  },
});

export const getKnowledgeGraphStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const nodes = await ctx.db.query("knowledge_graph_nodes").take(500);
    const edges = await ctx.db.query("knowledge_graph_edges").take(1000);
    const nodeTypes: Record<string, number> = {};
    for (const n of nodes) nodeTypes[n.nodeType] = (nodeTypes[n.nodeType] ?? 0) + 1;
    const relTypes: Record<string, number> = {};
    for (const e of edges) relTypes[e.relationship] = (relTypes[e.relationship] ?? 0) + 1;
    return { totalNodes: nodes.length, totalEdges: edges.length, nodeTypes, relationshipTypes: relTypes };
  },
});

export const deleteNode = mutation({
  args: { adminToken: v.string(), nodeId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const node = await ctx.db.query("knowledge_graph_nodes").withIndex("by_node_id", (q) => q.eq("nodeId", args.nodeId)).first();
    if (!node) return { error: "Not found" };
    await ctx.db.delete(node._id);
    return { success: true };
  },
});
