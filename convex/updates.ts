import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

const UPDATES = {
  SPRING_2026: {
    applied_at: new Date("2026-05-01").getTime(),
    services: [
      { agent_id: "A1", name: "AI-powered Peer Review", description: "Critical analysis of academic manuscripts with feedback.", icon: "🔍" },
      { agent_id: "A1", name: "E-Book Publishing", description: "Write, format, and design professional e-books for Amazon KDP.", icon: "📖" },
      { agent_id: "A1", name: "Citation Network Analysis", description: "Map the influence and connections of your sources.", icon: "🌐" },
      { agent_id: "A1", name: "Research Gap Identifier", description: "Find unexplored areas in your field of study.", icon: "🧩" },
      { agent_id: "A1", name: "Automated Reference Formatting", description: "20+ styles including APA, MLA, and Chicago.", icon: "📑" },
      { agent_id: "A1", name: "Plagiarism Prediction", description: "Predict similarity scores before official submission.", icon: "🛡️" },
      { agent_id: "A1", name: "Amazon KDP Publishing Service", description: "Full-service Amazon KDP book publishing with manuscript, cover, and interior file management.", icon: "📚" },
      
      { agent_id: "A3", name: "AI Video Description Generator", description: "SEO-optimized descriptions for your video content.", icon: "📹" },
      { agent_id: "A3", name: "YouTube Thumbnail A/B Tester", description: "Predict which thumbnail will perform better.", icon: "🖼️" },
      { agent_id: "A3", name: "Podcast Show Notes Generator", description: "Instant summaries and time-stamped notes.", icon: "🎙️" },
      { agent_id: "A3", name: "LinkedIn Carousel Post Creator", description: "Turn long articles into high-engagement slides.", icon: "🎠" },
      
      { agent_id: "A8", name: "AI Voice Cloning", description: "Generate voiceovers from a 30-second sample.", icon: "🎙️" },
      { agent_id: "A8", name: "Automatic Color Matching", description: "Sync colors across different video clips instantly.", icon: "🎨" },
      { agent_id: "A8", name: "Scene Transition Generator", description: "Smooth, AI-enhanced transitions between shots.", icon: "🎞️" },
      { agent_id: "A8", name: "Background Music Composer", description: "Original royalty-free music for your projects.", icon: "🎵" },
      { agent_id: "A8", name: "Vertical Video Reformatting", description: "Convert 16:9 to 9:16 and vice-versa.", icon: "📱" },
      
      { agent_id: "A13", name: "AI Essay Grader", description: "Instant grading with detailed feedback on structure.", icon: "✍️" },
      { agent_id: "A13", name: "Subject Recommendation Engine", description: "Find the best courses based on your goals.", icon: "🎓" },
      { agent_id: "A13", name: "University Application Tracker", description: "Never miss a deadline for your dream school.", icon: "📅" },
      { agent_id: "A13", name: "Scholarship Deadline Calendar", description: "Aggregated database of global scholarship dates.", icon: "💰" },
      { agent_id: "A15", name: "Autonomous Market Sniper", description: "Detect arbitrage opportunities in Nigerian real estate.", icon: "🎯" },
      { agent_id: "A15", name: "Lagos Freight Optimizer", description: "Logistics route planning for Apapa/Tin Can ports.", icon: "🚚" },
      { agent_id: "A12", name: "Medical Case Summarizer", description: "AI synthesis of patient records for busy clinics.", icon: "🏥" }
    ]
  },
  FALL_2026: {
    applied_at: new Date("2026-11-01").getTime(),
    services: [
      { agent_id: "A2", name: "AI Investor Matching", description: "Find the perfect VC for your business stage.", icon: "🤝" },
      { agent_id: "A2", name: "Pitch Practice Simulator", description: "Interactive roleplay with an AI venture capitalist.", icon: "🎤" },
      { agent_id: "A2", name: "Grant Finder", description: "Search thousands of grant opportunities instantly.", icon: "💵" },
      { agent_id: "A2", name: "Business Valuation Calculator", description: "Predict your company's worth with AI metrics.", icon: "📈" },
      
      { agent_id: "A5", name: "Price Prediction", description: "AI predicts when prices will drop for any item.", icon: "📉" },
      { agent_id: "A5", name: "AI Outfit Coordinator", description: "Complete looks based on your purchases.", icon: "👗" },
      { agent_id: "A5", name: "Gift Recommendation Engine", description: "Perfect gifts based on recipient profiles.", icon: "🎁" },
      { agent_id: "A5", name: "Bulk Order Discount Finder", description: "Auto-negotiate best rates for large orders.", icon: "📦" },
      
      { agent_id: "A14", name: "AI Accent Conversion", description: "Change accents in audio without losing emotion.", icon: "🗣️" },
      { agent_id: "A14", name: "Real-time Meeting Translation", description: "Instant captions for Zoom, Meet, and Teams.", icon: "💬" },
      { agent_id: "A14", name: "Document Redaction", description: "Auto-remove PII and sensitive info from files.", icon: "⬛" },
      { agent_id: "A14", name: "Audio Dubbing", description: "Perfect lip-synced audio in 20+ languages.", icon: "🎬" },
      { agent_id: "A14", name: "Legal Document Certification", description: "Simulated verification for translated legal files.", icon: "📜" }
    ]
  }
};

/**
 * INITIAL SEED: Basic services for all agents
 */
export const seedInitialServices = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const agents = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"];
    
    for (const aid of agents) {
      const existing = await ctx.db.query("agent_services")
        .withIndex("by_agent", q => q.eq("agent_id", aid))
        .first();

      if (!existing) {
        await ctx.db.insert("agent_services", {
          agent_id: aid,
          name: "Standard AI Consulting",
          description: "General high-level assistance and strategy.",
          icon: "🧠",
          added_at: Date.now() - (100 * 24 * 60 * 60 * 1000), // 100 days ago
        });
        await ctx.db.insert("agent_services", {
          agent_id: aid,
          name: "Advanced Automation",
          description: "Complex task management and workflow optimization.",
          icon: "⚡",
          added_at: Date.now() - (100 * 24 * 60 * 60 * 1000),
        });
      }
    }
  }
});

/**
 * BI-ANNUAL TASK: Check and apply service updates
 */
export const runServiceUpdates = mutation({
  args: { forceCycle: v.optional(v.string()) }, // Manually trigger specific cycle if provided
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    for (const [cycleName, data] of Object.entries(UPDATES)) {
      // If cycle is in the past (or now) and not applied yet
      if (now >= data.applied_at || args.forceCycle === cycleName) {
        const applied = await ctx.db.query("service_updates")
          .withIndex("by_cycle", q => q.eq("cycle", cycleName))
          .first();

        if (!applied) {
          console.log(`[UPDATER] Applying ${cycleName}...`);
          
          for (const s of data.services) {
            await ctx.db.insert("agent_services", {
              agent_id: s.agent_id,
              name: s.name,
              description: s.description,
              icon: s.icon,
              added_at: now,
            });
          }

          await ctx.db.insert("service_updates", {
            cycle: cycleName,
            applied_at: now,
          });

          // Broadcast notification to users
          await ctx.db.insert("notifications", {
             userId: undefined,
             title: "✨ Service Expansion Live!",
             message: `The ${cycleName.replace('_', ' ')} update has been applied. New intelligence layers active.`,
             type: "broadcast",
             read: false,
             createdAt: now
          });
        }
      }
    }
  }
});

/**
 * Public query for frontend to get services for an agent
 */
export const getAgentServices = query({
  args: { agent_id: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("agent_services")
      .withIndex("by_agent", q => q.eq("agent_id", args.agent_id))
      .collect();
  }
});
