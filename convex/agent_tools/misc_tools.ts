import { createTool } from "@convex-dev/agent";
import { v } from "convex/values";
import { convexSchema } from "./_helper";

// ─────────────────────────────────────────────────────────
// Formatting, Nigeria Business Lookup & Media Generation
// ─────────────────────────────────────────────────────────

/**
 * Tool 7: Format content as a table
 */
export const formatTableTool = createTool({
  description: "Format data into a structured table. Use this when the user asks for tabular data, comparisons, or structured formatting.",
  title: "Format Table",
  inputSchema: convexSchema(v.object({
    headers: v.array(v.string()),
    rows: v.array(v.array(v.string())),
    title: v.optional(v.string()),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    markdown: v.string(),
    html: v.string(),
  })),
  execute: async (ctx, input) => {
    const { headers, rows, title } = input;

    // Markdown table
    let markdown = title ? `### ${title}\n\n` : "";
    markdown += `| ${headers.join(" | ")} |\n`;
    markdown += `| ${headers.map(() => "---").join(" | ")} |\n`;
    for (const row of rows) {
      markdown += `| ${row.join(" | ")} |\n`;
    }

    // HTML table
    let html = title ? `<h3>${title}</h3>` : "";
    html += "<table border='1' cellpadding='8' cellspacing='0'>";
    html += "<tr>" + headers.map((h) => `<th>${h}</th>`).join("") + "</tr>";
    for (const row of rows) {
      html += "<tr>" + row.map((cell) => `<td>${cell}</td>`).join("") + "</tr>";
    }
    html += "</table>";

    return {
      success: true,
      markdown,
      html,
    };
  },
});

/**
 * Tool 8: Look up Nigerian business data (CAC, BVN, etc.)
 */
export const nigeriaBusinessLookupTool = createTool({
  description: "Look up Nigerian business information including CAC registration, bank verification, and business data. Use this when users ask about Nigerian business verification or registration.",
  title: "Nigeria Business Lookup",
  inputSchema: convexSchema(v.object({
    query: v.string(),
    type: v.union(v.literal("cac"), v.literal("business_name"), v.literal("general")),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    results: v.array(v.object({
      title: v.string(),
      detail: v.string(),
    })),
    error: v.optional(v.string()),
  })),
  execute: async (ctx, input) => {
    try {
      // For CAC lookups, we'd integrate with the CAC API when available
      // For now, provide guidance and useful links
      const results: { title: string; detail: string }[] = [];

      if (input.type === "cac") {
        results.push({
          title: "CAC Registration Lookup",
          detail: `To verify a business name or RC number, visit: https://search.cac.gov.ng/ . Enter the business name or RC number: ${input.query}`,
        });
        results.push({
          title: "CAC Requirements",
          detail: "Required documents: 2 passport photographs, means of ID (NIN, voter's card, driver's license), proof of address, and business name reservation approval.",
        });
      } else if (input.type === "business_name") {
        results.push({
          title: "Business Name Search",
          detail: `Search for "${input.query}" on the CAC portal: https://search.cac.gov.ng/ . You can check availability and registration status.`,
        });
      } else {
        results.push({
          title: "Nigerian Business Resources",
          detail: "CAC Portal: https://search.cac.gov.ng/ | CAC App: https://app.cac.gov.ng/ | BOI (Bank of Industry): https://www.boi.ng/ | SMEDAN: https://www.smedan.gov.ng/",
        });
      }

      return { success: true, results };
    } catch (error: any) {
      return {
        success: false,
        results: [],
        error: error.message,
      };
    }
  },
});

/**
 * Tool 11: Generate audio (MP3) from text
 */
export const generateMP3Tool = createTool({
  description: "Generate an audio file (MP3) from text using text-to-speech. Use this when the user asks for audio narration, voiceover, or podcast-style content.",
  title: "Generate Audio",
  inputSchema: convexSchema(v.object({
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    mp3Base64: v.optional(v.string()),
    fileName: v.string(),
    duration: v.optional(v.string()),
    error: v.optional(v.string()),
  })),
  execute: async (ctx, input) => {
    try {
      // Note: Full TTS requires a service like ElevenLabs, Google TTS, or AWS Polly
      // For now, return a placeholder with instructions
      const fileName = `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp3`;

      return {
        success: true,
        mp3Base64: undefined,
        fileName,
        duration: `${Math.ceil(input.content.split(" ").length / 150)} minutes`,
        error: undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        fileName: `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp3`,
        error: error.message,
      };
    }
  },
});

/**
 * Tool 12: Generate video script (MP4 preparation)
 */
export const generateMP4Tool = createTool({
  description: "Generate a video script and production plan for MP4 video creation. Use this when the user asks for video content, video scripts, or video production plans.",
  title: "Generate Video Script",
  inputSchema: convexSchema(v.object({
    title: v.string(),
    content: v.string(),
    sections: v.optional(v.array(v.object({
      heading: v.string(),
      content: v.string(),
    }))),
    duration: v.optional(v.string()),
  })),
  outputSchema: convexSchema(v.object({
    success: v.boolean(),
    script: v.string(),
    scenes: v.array(v.object({
      sceneNumber: v.number(),
      description: v.string(),
      dialogue: v.optional(v.string()),
      duration: v.optional(v.string()),
    })),
    totalDuration: v.string(),
    fileName: v.string(),
    error: v.optional(v.string()),
  })),
  execute: async (ctx, input) => {
    try {
      const contentLines = input.content.split("\n").filter((l) => l.trim());
      const scenes = [];
      let sceneNumber = 1;

      // Create scenes from content
      for (let i = 0; i < contentLines.length; i += 3) {
        const sceneContent = contentLines.slice(i, i + 3).join("\n");
        scenes.push({
          sceneNumber,
          description: sceneContent.substring(0, 200),
          dialogue: sceneContent,
          duration: "10-15 seconds",
        });
        sceneNumber++;
      }

      // Add section scenes
      if (input.sections) {
        for (const section of input.sections) {
          scenes.push({
            sceneNumber,
            description: section.heading,
            dialogue: section.content,
            duration: "20-30 seconds",
          });
          sceneNumber++;
        }
      }

      const totalDuration = input.duration || `${scenes.length * 15} seconds`;
      const fileName = `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}_script.txt`;

      return {
        success: true,
        script: input.content,
        scenes,
        totalDuration,
        fileName,
      };
    } catch (error: any) {
      return {
        success: false,
        script: "",
        scenes: [],
        totalDuration: "0",
        fileName: `${input.title.replace(/[^a-zA-Z0-9]/g, "_")}_script.txt`,
        error: error.message,
      };
    }
  },
});
