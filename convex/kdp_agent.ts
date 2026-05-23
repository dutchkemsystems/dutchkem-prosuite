import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export const startKDPProject = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const userId = await ctx.db.query("users").first(); // Simplified for demo, should use auth
    if (!userId) throw new Error("User not found");

    const projectId = await ctx.db.insert("kdp_projects", {
      userId: userId._id,
      title,
      status: "planning",
      assets: {},
      metadata: {
        keywords: [],
        categories: [],
        description: "",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.kdp_agent.generateKDPAssets, { projectId });
    return projectId;
  },
});

export const generateKDPAssets = internalAction({
  args: { projectId: v.id("kdp_projects") },
  handler: async (ctx, { projectId }) => {
    const nvidia = createOpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    // 1. Generate Manuscript
    console.log("[KDP] Generating manuscript...");
    const { text: manuscript } = await generateText({
      model: nvidia.chat("meta/llama-3.1-405b-instruct"),
      prompt: "Write a short professional e-book manuscript about passive income via Amazon KDP.",
    });

    // 2. Generate Metadata
    const { text: metadataRaw } = await generateText({
      model: nvidia.chat("meta/llama-3-8b-instruct"),
      prompt: "Generate 7 keywords, 3 categories, and an SEO description for a book about KDP passive income. Format as JSON.",
    });
    
    let metadata = { keywords: ["KDP", "Passive Income"], categories: ["Business"], description: "A great book." };
    try {
        metadata = JSON.parse(metadataRaw);
    } catch(e) {}

    // 3. Mock other assets (EPUB, PDF, Cover)
    // In a real app, you'd use a PDF lib and an image gen API
    const assets = {
      manuscriptUrl: "https://example.com/manuscript.docx",
      coverUrl: "https://example.com/cover.jpg",
      epubUrl: "https://example.com/book.epub",
      pdfUrl: "https://example.com/book.pdf",
      zipUrl: "https://example.com/kdp_bundle.zip",
    };

    await ctx.runMutation(internal.kdp_agent.updateProjectStatus, {
      projectId,
      status: "completed",
      assets,
      metadata,
    });

    return null;
  },
});

export const updateProjectStatus = internalMutation({
  args: { 
    projectId: v.id("kdp_projects"), 
    status: v.union(v.literal("planning"), v.literal("writing"), v.literal("designing"), v.literal("formatting"), v.literal("completed")),
    assets: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      status: args.status,
      assets: args.assets,
      metadata: args.metadata,
      updatedAt: Date.now(),
    });
  },
});

export const listUserProjects = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.query("kdp_projects")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();
  },
});

export const getRoyalties = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.query("kdp_royalties")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();
  },
});

export const importRoyalties = mutation({
  args: { 
    userId: v.id("users"), 
    data: v.array(v.object({ 
      bookTitle: v.string(), 
      amount: v.number(), 
      currency: v.string(), 
      date: v.string() 
    })) 
  },
  handler: async (ctx, args) => {
    for (const item of args.data) {
      await ctx.db.insert("kdp_royalties", {
        userId: args.userId,
        bookTitle: item.bookTitle,
        amount: item.amount,
        currency: item.currency,
        date: item.date,
      });
    }
  },
});
