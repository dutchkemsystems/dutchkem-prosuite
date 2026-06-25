import { v } from "convex/values";
import { query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// API DOCUMENTATION
// Self-documenting API for developers
// ═══════════════════════════════════════════════════════════════════

export const getApiDocs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return {
      version: "2.5",
      title: "DutchKem Ventures Prosuite API",
      description: "Complete API for AI-powered business automation",
      baseUrl: "https://warmhearted-aardvark-280.convex.cloud",
      authentication: "Admin token required for most endpoints",
      endpoints: [
        {
          category: "Authentication",
          endpoints: [
            { method: "POST", path: "/api/auth/login", description: "Login with credentials" },
            { method: "POST", path: "/api/auth/logout", description: "Logout user" },
            { method: "GET", path: "/api/auth/session", description: "Get current session" },
          ],
        },
        {
          category: "AI Router",
          endpoints: [
            { method: "POST", path: "ai_router:detectTask", description: "Detect task type from input" },
            { method: "POST", path: "ai_router:routeRequest", description: "Route request to best AI provider" },
          ],
        },
        {
          category: "Ad Engine",
          endpoints: [
            { method: "POST", path: "adEngine:createCampaign", description: "Create ad campaign" },
            { method: "POST", path: "adEngine:createAd", description: "Create ad in campaign" },
            { method: "POST", path: "adEngine:executeAdPost", description: "Post ad to platform" },
            { method: "GET", path: "adEngine:getCampaigns", description: "List all campaigns" },
            { method: "GET", path: "adEngine:getAds", description: "List ads in campaign" },
          ],
        },
        {
          category: "WhatsApp",
          endpoints: [
            { method: "POST", path: "whatsapp_integration:sendWhatsAppMessage", description: "Send WhatsApp message" },
            { method: "POST", path: "whatsapp_integration:sendWhatsAppBulk", description: "Send bulk WhatsApp messages" },
            { method: "POST", path: "whatsapp_integration:sendWelcomeMessage", description: "Send welcome message" },
          ],
        },
        {
          category: "SMS",
          endpoints: [
            { method: "POST", path: "sms_notifications:sendSMS", description: "Send SMS message" },
            { method: "POST", path: "sms_notifications:sendBulkSMS", description: "Send bulk SMS" },
            { method: "POST", path: "sms_notifications:sendWelcomeSMS", description: "Send welcome SMS" },
          ],
        },
        {
          category: "Push Notifications",
          endpoints: [
            { method: "POST", path: "push_notifications:sendPushNotification", description: "Send push notification" },
            { method: "POST", path: "push_notifications:sendBroadcastPush", description: "Send broadcast push" },
          ],
        },
        {
          category: "Payments",
          endpoints: [
            { method: "POST", path: "stripe_integration:createCheckoutSession", description: "Create Stripe checkout" },
            { method: "POST", path: "payment_enhancement:initiatePayment", description: "Initiate payment" },
          ],
        },
        {
          category: "Subscriptions",
          endpoints: [
            { method: "GET", path: "subscriptions:hasActiveSubscription", description: "Check active subscription" },
            { method: "POST", path: "subscriptions:createSubscription", description: "Create subscription" },
          ],
        },
        {
          category: "Video Production",
          endpoints: [
            { method: "POST", path: "video_production:developStory", description: "Develop video story" },
            { method: "POST", path: "video_production:generateScenes", description: "Generate video scenes" },
            { method: "POST", path: "video_production:assembleVideo", description: "Assemble final video" },
          ],
        },
        {
          category: "Image Generation",
          endpoints: [
            { method: "POST", path: "ai_image_generator:generateImage", description: "Generate AI image" },
            { method: "POST", path: "ai_image_generator:generateVideo", description: "Generate AI video" },
            { method: "POST", path: "ad_designer:createNewAdDesign", description: "Create new ad design" },
          ],
        },
        {
          category: "Analytics",
          endpoints: [
            { method: "GET", path: "analytics_dashboard:getAnalyticsOverview", description: "Get analytics overview" },
            { method: "GET", path: "analytics_dashboard:getByPlatform", description: "Get analytics by platform" },
          ],
        },
        {
          category: "Affiliate",
          endpoints: [
            { method: "POST", path: "affiliate_system:generateAffiliateLink", description: "Generate affiliate link" },
            { method: "POST", path: "affiliate_system:trackAffiliateConversion", description: "Track conversion" },
          ],
        },
      ],
    };
  },
});

export const getApiExamples = query({
  args: { endpoint: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      sendWhatsApp: {
        request: `await sendWhatsAppMessage({
  adminToken: "your_token",
  phoneNumber: "+2348012345678",
  message: "Hello from DutchKem!"
});`,
        response: `{ success: true, messageId: "msg_123" }`,
      },
      createCampaign: {
        request: `await createCampaign({
  adminToken: "your_token",
  name: "Summer Sale",
  platform: "instagram",
  budget: 50000
});`,
        response: `{ success: true, campaignId: "camp_123" }`,
      },
      generateVideo: {
        request: `await generateVideo({
  adminToken: "your_token",
  prompt: "30-second promo video for AI services",
  duration: 30
});`,
        response: `{ success: true, videoUrl: "https://..." }`,
      },
    };
  },
});
