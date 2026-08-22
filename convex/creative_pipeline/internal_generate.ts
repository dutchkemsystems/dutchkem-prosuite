import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { FLYER_TEMPLATES, POSTER_TEMPLATES, VIDEO_TEMPLATES } from "./templates";

async function generateWithPollinations(prompt: string, width: number, height: number): Promise<string | null> {
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;
    const response = await fetch(url, { redirect: "follow" });
    if (response.ok) {
      return response.url;
    }
  } catch (e: any) {
    console.error("[CREATIVE] Pollinations.ai failed:", e?.message || e);
  }
  return null;
}

async function generateVideoWithHuggingFace(prompt: string): Promise<string | null> {
  const hfKey = process.env.VITE_HUGGINGFACE_API_TOKEN;
  if (!hfKey) return null;

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/ali-vilab/text-to-video-ms-1.7b", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 1000) {
        const buffer = await blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:video/mp4;base64,${base64}`;
      }
    }
  } catch (e: any) {
    console.error("[CREATIVE] HuggingFace video failed:", e?.message || e);
  }
  return null;
}

export const generateFlyerInternalNoAuth = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const template = FLYER_TEMPLATES[Math.floor(Math.random() * FLYER_TEMPLATES.length)];
    const replicateKey = process.env.REPLICATE_API_TOKEN;

    const prompt = `Marketing flyer design for "${template.headline}".
    Features: ${template.features.join(", ")}.
    Call to action: "${template.cta}".
    Style: ${template.style}, modern, vibrant, eye-catching.
    Format: vertical flyer, high quality, print-ready.
    Include website URL: https://dutchkem-prosuite-app.vercel.app`;

    if (replicateKey) {
      try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${replicateKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "ideogram-ai/ideogram-v3-turbo",
            input: {
              prompt,
              width: 768,
              height: 1344,
            },
          }),
        });

        if (response.ok) {
          const prediction = await response.json();
          let result = prediction;
          const maxAttempts = 60;
          let attempts = 0;

          while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
              headers: { "Authorization": `Token ${replicateKey}` },
            });
            result = await pollResponse.json();
            attempts++;
          }

          if (result.status === "succeeded" && result.output) {
            const images = Array.isArray(result.output) ? result.output : [result.output];
            const flyerId = await ctx.runMutation(internal.creative_pipeline.saveFlyerInternal, {
              headline: template.headline,
              features: template.features,
              cta: template.cta,
              imageUrl: images[0],
            });
            return { success: true, flyerId, imageUrl: images[0], model: "Ideogram v3 Turbo" };
          }
        }
      } catch {
        // Replicate failed, falling back to Pollinations.ai
      }
    }

    const pollinationsUrl = await generateWithPollinations(prompt, 768, 1344);
    if (pollinationsUrl) {
      const flyerId = await ctx.runMutation(internal.creative_pipeline.saveFlyerInternal, {
        headline: template.headline,
        features: template.features,
        cta: template.cta,
        imageUrl: pollinationsUrl,
      });
      return { success: true, flyerId, imageUrl: pollinationsUrl, model: "Pollinations.ai (Free)" };
    }

    return { success: false, error: "All generation methods failed" };
  },
});

export const generatePosterInternalNoAuth = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const template = POSTER_TEMPLATES[Math.floor(Math.random() * POSTER_TEMPLATES.length)];
    const replicateKey = process.env.REPLICATE_API_TOKEN;

    const prompt = `Professional marketing poster design for "${template.headline}".
    Subtitle: "${template.subheadline}".
    Call to action: "${template.cta}".
    Style: ${template.style}, modern, clean, professional.
    Colors: vibrant, eye-catching.
    Layout: clean typography, strong visual hierarchy.
    Include website URL: https://dutchkem-prosuite-app.vercel.app`;

    if (replicateKey) {
      try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${replicateKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "ideogram-ai/ideogram-v3-turbo",
            input: {
              prompt,
              width: 1024,
              height: 1024,
            },
          }),
        });

        if (response.ok) {
          const prediction = await response.json();
          let result = prediction;
          const maxAttempts = 60;
          let attempts = 0;

          while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
              headers: { "Authorization": `Token ${replicateKey}` },
            });
            result = await pollResponse.json();
            attempts++;
          }

          if (result.status === "succeeded" && result.output) {
            const images = Array.isArray(result.output) ? result.output : [result.output];
            const posterId = await ctx.runMutation(internal.creative_pipeline.savePosterInternal, {
              headline: template.headline,
              subheadline: template.subheadline,
              cta: template.cta,
              imageUrl: images[0],
            });
            return { success: true, posterId, imageUrl: images[0], model: "Ideogram v3 Turbo" };
          }
        }
      } catch {
        // Replicate failed, falling back to Pollinations.ai
      }
    }

    const pollinationsUrl = await generateWithPollinations(prompt, 1024, 1024);
    if (pollinationsUrl) {
      const posterId = await ctx.runMutation(internal.creative_pipeline.savePosterInternal, {
        headline: template.headline,
        subheadline: template.subheadline,
        cta: template.cta,
        imageUrl: pollinationsUrl,
      });
      return { success: true, posterId, imageUrl: pollinationsUrl, model: "Pollinations.ai (Free)" };
    }

    return { success: false, error: "All generation methods failed" };
  },
});

export const generateVideoInternalNoAuth = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const template = VIDEO_TEMPLATES[Math.floor(Math.random() * VIDEO_TEMPLATES.length)];
    const replicateKey = process.env.REPLICATE_API_TOKEN;

    const prompt = `Promotional video for "${template.headline}".
    Features: ${template.features.join(", ")}.
    Call to action: "${template.cta}".
    Style: ${template.style}, modern, professional, engaging.
    Duration: 5 seconds.
    Include text overlays with key messages.`;

    if (replicateKey) {
      try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${replicateKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "wan-video/wan-2.5-t2v-fast",
            input: {
              prompt,
              num_frames: 120,
              fps: 24,
            },
          }),
        });

        if (response.ok) {
          const prediction = await response.json();
          let result = prediction;
          const maxAttempts = 120;
          let attempts = 0;

          while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 3000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
              headers: { "Authorization": `Token ${replicateKey}` },
            });
            result = await pollResponse.json();
            attempts++;
          }

          if (result.status === "succeeded" && result.output) {
            const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
            const videoId = await ctx.runMutation(internal.creative_pipeline.saveVideoInternal, {
              headline: template.headline,
              features: template.features,
              cta: template.cta,
              videoUrl,
            });
            return { success: true, videoId, videoUrl, model: "Wan 2.5 T2V Fast", duration: 5 };
          }
        }
      } catch {
        // Replicate failed, falling back to HuggingFace
      }
    }

    const hfVideoUrl = await generateVideoWithHuggingFace(prompt);
    if (hfVideoUrl) {
      const videoId = await ctx.runMutation(internal.creative_pipeline.saveVideoInternal, {
        headline: template.headline,
        features: template.features,
        cta: template.cta,
        videoUrl: hfVideoUrl,
      });
      return { success: true, videoId, videoUrl: hfVideoUrl, model: "HuggingFace (Free)", duration: 5 };
    }

    return { success: false, error: "All generation methods failed" };
  },
});
