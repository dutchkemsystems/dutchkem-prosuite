import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getAuthUserId } from "@convex-dev/auth/server";

export const startKDPProject = mutation({
  args: { title: v.string() },
  returns: v.any(),
  handler: async (ctx, { title }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not found");

    const projectId = await ctx.db.insert("kdp_projects", {
      userId,
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
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    const nvidia = createOpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    // 1. Generate Manuscript
    console.log("[KDP] Generating manuscript...");
    const { text: _manuscript } = await generateText({
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
    } catch(e) {
        console.error("[KDP] Failed to parse metadata JSON:", e);
        // Try to extract JSON from the response if it's wrapped in text
        const jsonMatch = metadataRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { metadata = JSON.parse(jsonMatch[0]); } catch(e2) { /* use defaults */ }
        }
    }

    // Generate asset URLs based on project data
    // In production, these would be actual uploaded file URLs from storage
    const assets = {
      manuscriptUrl: `manuscripts/${projectId}_manuscript.docx`,
      coverUrl: `covers/${projectId}_cover.jpg`,
      epubUrl: `epubs/${projectId}_book.epub`,
      pdfUrl: `pdfs/${projectId}_book.pdf`,
      zipUrl: `bundles/${projectId}_kdp_bundle.zip`,
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
  returns: v.null(),
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
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("kdp_projects")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();
  },
});

export const getRoyalties = query({
  args: { userId: v.id("users") },
  returns: v.any(),
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
  returns: v.null(),
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

export const createBookProject = mutation({
  args: {
    subscriptionTier: v.union(v.literal("Basic"), v.literal("Pro"), v.literal("Enterprise")),
    manuscript: v.object({
      title: v.string(),
      subtitle: v.optional(v.string()),
      authorName: v.string(),
      authorBio: v.optional(v.string()),
      description: v.string(),
      keywords: v.array(v.string()),
      categories: v.array(v.string()),
      trimSize: v.string(),
      pageCount: v.number(),
      interiorType: v.string(),
      bleedSetting: v.string(),
      coverType: v.string(),
    }),
    kdpMetadata: v.object({
      kdpAccountEmail: v.string(),
      publishingRole: v.string(),
      imprintName: v.optional(v.string()),
      isbnOption: v.string(),
      pricingTiers: v.array(v.string()),
    }),
  },
  returns: v.id("book_projects"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("book_projects", {
      userId,
      subscriptionTier: args.subscriptionTier,
      status: "draft",
      manuscript: args.manuscript,
      coverFiles: [],
      interiorFiles: [],
      kdpMetadata: args.kdpMetadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateBookProject = mutation({
  args: {
    projectId: v.id("book_projects"),
    status: v.optional(v.union(v.literal("draft"), v.literal("in_progress"), v.literal("review"), v.literal("published"), v.literal("archived"))),
    manuscript: v.optional(v.object({
      title: v.string(),
      subtitle: v.optional(v.string()),
      authorName: v.string(),
      authorBio: v.optional(v.string()),
      description: v.string(),
      keywords: v.array(v.string()),
      categories: v.array(v.string()),
      trimSize: v.string(),
      pageCount: v.number(),
      interiorType: v.string(),
      bleedSetting: v.string(),
      coverType: v.string(),
    })),
    kdpMetadata: v.optional(v.object({
      kdpAccountEmail: v.string(),
      publishingRole: v.string(),
      imprintName: v.optional(v.string()),
      isbnOption: v.string(),
      pricingTiers: v.array(v.string()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status) patch.status = args.status;
    if (args.manuscript) patch.manuscript = args.manuscript;
    if (args.kdpMetadata) patch.kdpMetadata = args.kdpMetadata;

    await ctx.db.patch(args.projectId, patch);
  },
});

export const uploadBookFile = mutation({
  args: {
    projectId: v.id("book_projects"),
    section: v.union(v.literal("cover"), v.literal("interior")),
    file: v.object({
      type: v.string(),
      fileUrl: v.string(),
      fileName: v.string(),
      uploadedAt: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");

    if (args.section === "cover") {
      await ctx.db.patch(args.projectId, {
        coverFiles: [...project.coverFiles, args.file],
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.projectId, {
        interiorFiles: [...project.interiorFiles, args.file],
        updatedAt: Date.now(),
      });
    }
  },
});

export const listBookProjects = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("book_projects")
      .withIndex("by_user", q => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getBookProject = query({
  args: { projectId: v.id("book_projects") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

export const setBookRoyaltyData = mutation({
  args: {
    projectId: v.id("book_projects"),
    csvDataUrl: v.string(),
    dashboardData: v.object({
      totalSold: v.number(),
      totalRevenue: v.number(),
      averagePrice: v.number(),
      returns: v.number(),
      penaltyCharges: v.number(),
      netRoyalties: v.number(),
      monthlyTrend: v.array(v.object({
        month: v.string(),
        sales: v.number(),
        revenue: v.number(),
      })),
    }),
    month: v.string(),
    year: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");

    await ctx.db.insert("book_royalties", {
      userId,
      projectId: args.projectId,
      csvDataUrl: args.csvDataUrl,
      dashboardData: args.dashboardData,
      month: args.month,
      year: args.year,
    });
  },
});

export const getBookRoyalties = query({
  args: { projectId: v.id("book_projects") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("book_royalties")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});
