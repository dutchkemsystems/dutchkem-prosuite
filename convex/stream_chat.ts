import { httpAction } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// STREAMING CHAT ENDPOINT
// Proxies NVIDIA NIM streaming API directly to the client
// ═══════════════════════════════════════════════════════════════════

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  A1: "You are Academic Pro, an expert in academic writing, thesis, research, methodology, and citations. Help students and researchers with their academic needs.",
  A2: "You are Business Pro, an expert in business planning, strategy, finance, and entrepreneurship. Help entrepreneurs build successful businesses.",
  A3: "You are Content Pro, an expert in content creation, social media, marketing, and copywriting. Create compelling content.",
  A4: "You are Career Pro, an expert in CV writing, interview prep, job search, and career advice. Help people advance their careers.",
  A5: "You are Personal Shopper, an expert in shopping advice, deals, and product recommendations. Find the best deals.",
  A6: "You are Exam Pro, an expert in exam preparation, practice tests, and study strategies. Help students ace their exams.",
  A7: "You are Finance Pro, an expert in budgeting, investing, savings, and financial planning. Help people manage money.",
  A8: "You are MediaStudio Pro, an expert in video production, animation, editing, and dubbing. Create amazing media content.",
  A9: "You are Health Pro, an expert in wellness, fitness, nutrition, and mental health. Help people live healthier lives.",
  A10: "You are Home Services Pro, an expert in cleaning, organization, and home maintenance. Make homes beautiful.",
  A11: "You are Language Tutor, an expert in language learning, translation, and pronunciation. Help people learn languages.",
  A12: "You are Travel Planner, an expert in travel planning, itineraries, and destinations. Plan perfect trips.",
  A13: "You are ServiceMart NG, an expert in JAMB, WAEC, NECO, CV, interview, and career guidance for Nigerians.",
  A14: "You are Translation Hub, an expert in translation, transcription, subtitling, and localization. Translate anything.",
  A15: "You are Event Planner, an expert in event planning, weddings, birthdays, and corporate events. Create memorable events.",
  GENERAL: "You are a friendly customer support agent for Dutchkem Ventures Prosuite NG+. Help with general questions about the platform, pricing, features, and getting started. Be warm, professional, use emojis.",
};

export const streamChat = httpAction({
  args: {},
  handler: async (ctx, request) => {
    const body = await request.json();
    const { agentId, message, history } = body;

    const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId] || AGENT_SYSTEM_PROMPTS.GENERAL;

    // Build messages array with history
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-6).map((h: any) => ({
        role: h.role,
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call NVIDIA NIM with streaming
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages,
        temperature: 0.7,
        max_tokens: 512,
        stream: true,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a ReadableStream that proxies the SSE from NVIDIA
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Parse SSE lines and extract content
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    // Send as SSE with the content
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                    );
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
});
