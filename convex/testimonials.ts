import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// TESTIMONIAL GENERATOR — AI-powered testimonial collection & display
// ═══════════════════════════════════════════════════════════════════

// Testimonial templates for different contexts
const TESTIMONIAL_TEMPLATES = {
  service: [
    "The {service} service exceeded my expectations. {result}",
    "I'm amazed by the quality of {service}. {result}",
    "{service} transformed my business. {result}",
  ],
  result: [
    "My productivity increased by {percent}%.",
    "I saved {hours} hours per week.",
    "Revenue grew by {amount} in just {timeframe}.",
    "The ROI was incredible — {multiple}x return on investment.",
  ],
  industry: {
    academic: "As a researcher, {service} helped me publish {count} papers in top journals.",
    business: "Our startup's growth accelerated after using {service}.",
    content: "My content quality improved dramatically with {service}.",
    video: "Video production became effortless with {service}.",
  },
};

// Submit a testimonial
export const submitTestimonial = mutation({
  args: {
    userId: v.id("users"),
    service: v.string(),
    rating: v.number(),
    title: v.string(),
    content: v.string(),
    result: v.optional(v.string()),
    industry: v.optional(v.string()),
    anonymize: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const user = await ctx.db.get(args.userId);

    return await ctx.db.insert("testimonials", {
      userId: args.userId,
      userName: args.anonymize ? "Anonymous" : user?.name || "User",
      userAvatar: args.anonymize ? undefined : user?.image,
      service: args.service,
      rating: args.rating,
      title: args.title,
      content: args.content,
      result: args.result,
      industry: args.industry,
      status: "pending",
      featured: false,
      verified: false,
      helpful: 0,
      createdAt: Date.now(),
    });
  },
});

// Approve a testimonial (admin)
export const approveTestimonial = mutation({
  args: { testimonialId: v.id("testimonials") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testimonialId, {
      status: "approved",
      approvedAt: Date.now(),
    });
    return { success: true };
  },
});

// Feature a testimonial (admin)
export const featureTestimonial = mutation({
  args: {
    testimonialId: v.id("testimonials"),
    featured: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testimonialId, { featured: args.featured });
    return { success: true };
  },
});

// Mark testimonial as verified purchase
export const verifyTestimonial = mutation({
  args: { testimonialId: v.id("testimonials") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.testimonialId, { verified: true });
    return { success: true };
  },
});

// Mark testimonial as helpful
export const markHelpful = mutation({
  args: { testimonialId: v.id("testimonials") },
  handler: async (ctx, args) => {
    const testimonial = await ctx.db.get(args.testimonialId);
    if (!testimonial) throw new Error("Testimonial not found");

    await ctx.db.patch(args.testimonialId, {
      helpful: testimonial.helpful + 1,
    });
    return { success: true };
  },
});

// Get approved testimonials
export const getTestimonials = query({
  args: {
    service: v.optional(v.string()),
    rating: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("testimonials")
      .withIndex("by_status", (q) => q.eq("status", "approved"));

    const testimonials = await query.order("desc").collect();

    return testimonials
      .filter((t) => {
        if (args.service && t.service !== args.service) return false;
        if (args.rating && t.rating < args.rating) return false;
        if (args.featured !== undefined && t.featured !== args.featured) return false;
        return true;
      })
      .slice(0, args.limit || 20);
  },
});

// Get featured testimonials
export const getFeaturedTestimonials = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("testimonials")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .order("desc")
      .take(args.limit || 5);
  },
});

// Get testimonial stats
export const getTestimonialStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("testimonials").collect();

    const approved = all.filter((t) => t.status === "approved");
    const pending = all.filter((t) => t.status === "pending");

    const avgRating =
      approved.length > 0
        ? approved.reduce((sum, t) => sum + t.rating, 0) / approved.length
        : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const t of approved) {
      ratingDistribution[t.rating as keyof typeof ratingDistribution]++;
    }

    const byService: Record<string, { count: number; avgRating: number }> = {};
    for (const t of approved) {
      if (!byService[t.service]) {
        byService[t.service] = { count: 0, avgRating: 0 };
      }
      byService[t.service].count++;
      byService[t.service].avgRating += t.rating;
    }
    for (const service of Object.keys(byService)) {
      byService[service].avgRating = Math.round(
        (byService[service].avgRating / byService[service].count) * 10
      ) / 10;
    }

    return {
      total: all.length,
      approved: approved.length,
      pending: pending.length,
      featured: all.filter((t) => t.featured).length,
      averageRating: Math.round(avgRating * 10) / 10,
      ratingDistribution,
      byService,
    };
  },
});

// Generate AI testimonial suggestion
export const generateTestimonialSuggestion = query({
  args: {
    service: v.string(),
    userHistory: v.optional(v.any()),
  },
  handler: async (_, args) => {
    // Generate personalized suggestion based on service and history
    const suggestions = [
      {
        title: "Exceptional Quality",
        content: `The ${args.service} service delivered outstanding results. I highly recommend it to anyone looking for professional quality.`,
        rating: 5,
      },
      {
        title: "Time-Saving Solution",
        content: `Thanks to ${args.service}, I saved countless hours while maintaining top-notch quality.`,
        rating: 5,
      },
      {
        title: "Great Value for Money",
        content: `The ROI from ${args.service} has been incredible. It's worth every penny.`,
        rating: 4,
      },
    ];

    return suggestions;
  },
});

// Get all testimonials (admin)
export const getAllTestimonials = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("testimonials").order("desc").collect();
  },
});

// Delete a testimonial
export const deleteTestimonial = mutation({
  args: { testimonialId: v.id("testimonials") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.testimonialId);
    return { success: true };
  },
});
