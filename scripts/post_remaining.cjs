const { Composio } = require("@composio/core");

const FLYER_URL = "https://dutchkem-prosuite-app.vercel.app";

const POSTS = [
  {
    content: `🚀 Transform Your Business with AI-Powered Automation!\n\nDutchkem Pro Suite gives you 15+ AI agents working 24/7:\n✅ Content Writer — Viral social posts & SEO blogs\n✅ Finance Advisor — Smart money management\n✅ Business Consultant — Strategic growth planning\n✅ Career Coach — Land your dream job\n\nStart your free trial today 👇\n${FLYER_URL}\n\n#AI #BusinessAutomation #DigitalTransformation #TechStartup #Innovation`,
  },
  {
    content: `🔥 Why 500+ Businesses Choose Dutchkem Pro Suite\n\n🎯 10x faster content creation\n💰 40% reduction in operational costs\n📈 3x improvement in customer engagement\n🤖 15+ AI agents at your fingertips\n\n"The ROI was immediate. We saved 20 hours/week on content alone." — Sarah K., CEO\n\nTry it free: ${FLYER_URL}\n\n#AITools #BusinessGrowth #Productivity #SaaS`,
  },
  {
    content: `💡 Your Business Deserves Better Than Manual Work\n\nIntroducing Dutchkem Pro Suite — the all-in-one AI platform that:\n✨ Writes your marketing content\n✨ Manages your finances\n✨ Plans your events\n✨ Handles customer support\n✨ And 10 more powerful agents\n\n🎁 Limited time: 14-day FREE trial\n\nGet started → ${FLYER_URL}\n\n#AI #Automation #SmallBusiness #Entrepreneur`,
  },
  {
    content: `⚡ STOP wasting hours on repetitive tasks\n\nDutchkem Pro Suite automates:\n📝 Content creation (blogs, social, emails)\n📊 Financial analysis & reporting\n🎯 Marketing strategy & execution\n🤝 Customer relationship management\n\nAll powered by cutting-edge AI.\n\nStart free: ${FLYER_URL}\n\n#ProductivityHack #AI #BusinessTools #Workflow`,
  },
  {
    content: `🎉 Join 500+ Smart Businesses Using AI\n\nDutchkem Pro Suite Features:\n• AI Content Writer — Create 30 days of content in 2 hours\n• Finance Advisor — Real-time financial insights\n• Event Planner — Perfect events every time\n• Translation Hub — Reach global audiences\n\nFree trial available now!\n${FLYER_URL}\n\n#DigitalMarketing #AI #GrowthHacking #StartupLife`,
  },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const composio = new Composio({ apiKey });
  const session = await composio.create("admin_dutchkem");
  const tools = await session.tools();
  const executeTool = tools.find((t) => t.function?.name === "COMPOSIO_MULTI_EXECUTE_TOOL");

  // Check connections
  const manageTool = tools.find((t) => t.function?.name === "COMPOSIO_MANAGE_CONNECTIONS");
  if (manageTool) {
    console.log("Checking connections...");
    const connResult = await session.execute("COMPOSIO_MANAGE_CONNECTIONS", {
      toolkits: ["instagram", "youtube", "discord"],
    });
    const connStr = JSON.stringify(connResult);
    for (const p of ["instagram", "youtube", "discord"]) {
      const status = connStr.match(new RegExp(`"${p}".*?"status"\\s*:\\s*"([^"]+)"`));
      console.log(`  ${p}: ${status ? status[1] : "unknown"}`);
    }
  }

  // Search for correct tool names
  console.log("\nSearching for platform tools...");
  const searchResult = await session.execute("COMPOSIO_SEARCH_TOOLS", {
    queries: [
      { use_case: "post text to Instagram" },
      { use_case: "post text to YouTube community" },
      { use_case: "send message to Discord channel" },
    ],
    session: { generate_id: true },
  });

  const searchStr = JSON.stringify(searchResult);

  // Extract tool slugs for each platform
  const instagramSlugs = searchStr.match(/"tool_slug"\s*:\s*"INSTAGRAM_[^"]+"/g)?.map(m => m.match(/"([^"]+)"$/)[1]) || [];
  const youtubeSlugs = searchStr.match(/"tool_slug"\s*:\s*"YOUTUBE_[^"]+"/g)?.map(m => m.match(/"([^"]+)"$/)[1]) || [];
  const discordSlugs = searchStr.match(/"tool_slug"\s*:\s*"DISCORD_[^"]+"/g)?.map(m => m.match(/"([^"]+)"$/)[1]) || [];

  console.log(`Instagram tools: ${instagramSlugs.join(", ")}`);
  console.log(`YouTube tools: ${youtubeSlugs.join(", ")}`);
  console.log(`Discord tools: ${discordSlugs.join(", ")}`);

  // Find the best posting tool for each platform
  const instagramPostTool = instagramSlugs.find(s => s.includes("POST")) || instagramSlugs[0];
  const youtubePostTool = youtubeSlugs.find(s => s.includes("POST") || s.includes("COMMUNITY")) || youtubeSlugs[0];
  const discordPostTool = discordSlugs.find(s => s.includes("SEND") || s.includes("MESSAGE")) || discordSlugs[0];

  console.log(`\nUsing tools:`);
  console.log(`  Instagram: ${instagramPostTool}`);
  console.log(`  YouTube: ${youtubePostTool}`);
  console.log(`  Discord: ${discordPostTool}`);

  const allResults = [];

  // Post to Instagram
  if (instagramPostTool) {
    console.log("\n--- Posting to Instagram ---");
    for (let i = 0; i < Math.min(3, POSTS.length); i++) {
      try {
        const result = await executeTool
          ? await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
              tools: [{ tool_slug: instagramPostTool, arguments: { caption: POSTS[i].content } }],
              sync_response_to_workbench: false,
              thought: `Posting to Instagram ${i + 1}`,
              current_step: `INSTAGRAM_${i + 1}`,
            })
          : null;

        const resultStr = JSON.stringify(result);
        const success = resultStr.includes('"successful":true');
        const error = resultStr.match(/"error"\s*:\s*"([^"]+)"/);
        allResults.push({ platform: "instagram", postIndex: i + 1, success, error: error?.[1] });
        console.log(`  Post ${i + 1}: ${success ? "✅" : "❌"}${error ? " " + error[1].substring(0, 80) : ""}`);
        await sleep(3000);
      } catch (err) {
        console.error(`  Post ${i + 1}: ❌ ${err.message.substring(0, 100)}`);
        allResults.push({ platform: "instagram", postIndex: i + 1, success: false, error: err.message });
      }
    }
  }

  // Post to YouTube (community posts)
  if (youtubePostTool) {
    console.log("\n--- Posting to YouTube ---");
    for (let i = 0; i < Math.min(3, POSTS.length); i++) {
      try {
        const result = await executeTool
          ? await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
              tools: [{ tool_slug: youtubePostTool, arguments: { text: POSTS[i].content } }],
              sync_response_to_workbench: false,
              thought: `Posting to YouTube ${i + 1}`,
              current_step: `YOUTUBE_${i + 1}`,
            })
          : null;

        const resultStr = JSON.stringify(result);
        const success = resultStr.includes('"successful":true');
        const error = resultStr.match(/"error"\s*:\s*"([^"]+)"/);
        allResults.push({ platform: "youtube", postIndex: i + 1, success, error: error?.[1] });
        console.log(`  Post ${i + 1}: ${success ? "✅" : "❌"}${error ? " " + error[1].substring(0, 80) : ""}`);
        await sleep(3000);
      } catch (err) {
        console.error(`  Post ${i + 1}: ❌ ${err.message.substring(0, 100)}`);
        allResults.push({ platform: "youtube", postIndex: i + 1, success: false, error: err.message });
      }
    }
  }

  // Post to Discord
  if (discordPostTool) {
    console.log("\n--- Posting to Discord ---");
    // Discord needs a channel ID - let's search for available channels
    const channelSearch = await session.execute("COMPOSIO_SEARCH_TOOLS", {
      queries: [{ use_case: "list Discord channels" }],
      session: { generate_id: true },
    });

    const channelStr = JSON.stringify(channelSearch);
    const channelTool = channelStr.match(/"tool_slug"\s*:\s*"DISCORD_LIST_[^"]+"/)?.[0]?.match(/"([^"]+)"$/)?.[1];

    if (channelTool) {
      const channelsResult = await executeTool
        ? await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
            tools: [{ tool_slug: channelTool, arguments: {} }],
            sync_response_to_workbench: false,
            thought: "Getting Discord channels",
            current_step: "GET_CHANNELS",
          })
        : null;

      console.log("Discord channels:", JSON.stringify(channelsResult, null, 2).substring(0, 1000));

      // Extract first channel ID
      const channelStr2 = JSON.stringify(channelsResult);
      const channelIdMatch = channelStr2.match(/"id"\s*:\s*"(\d+)"/);
      const channelId = channelIdMatch ? channelIdMatch[1] : null;

      if (channelId && discordPostTool) {
        console.log(`Using channel: ${channelId}`);
        for (let i = 0; i < Math.min(3, POSTS.length); i++) {
          try {
            const result = await executeTool
              ? await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
                  tools: [{ tool_slug: discordPostTool, arguments: { channel_id: channelId, content: POSTS[i].content } }],
                  sync_response_to_workbench: false,
                  thought: `Posting to Discord ${i + 1}`,
                  current_step: `DISCORD_${i + 1}`,
                })
              : null;

            const resultStr = JSON.stringify(result);
            const success = resultStr.includes('"successful":true');
            const error = resultStr.match(/"error"\s*:\s*"([^"]+)"/);
            allResults.push({ platform: "discord", postIndex: i + 1, success, error: error?.[1] });
            console.log(`  Post ${i + 1}: ${success ? "✅" : "❌"}${error ? " " + error[1].substring(0, 80) : ""}`);
            await sleep(2000);
          } catch (err) {
            console.error(`  Post ${i + 1}: ❌ ${err.message.substring(0, 100)}`);
            allResults.push({ platform: "discord", postIndex: i + 1, success: false, error: err.message });
          }
        }
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("POSTING SUMMARY");
  console.log("=".repeat(60));
  const byPlatform = {};
  for (const r of allResults) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = { success: 0, failed: 0 };
    r.success ? byPlatform[r.platform].success++ : byPlatform[r.platform].failed++;
  }
  for (const [p, s] of Object.entries(byPlatform)) console.log(`${p}: ${s.success} posted, ${s.failed} failed`);
  const total = allResults.length;
  const ok = allResults.filter(r => r.success).length;
  console.log(`\nTotal: ${ok} posted, ${total - ok} failed out of ${total} attempts`);
  console.log("=".repeat(60));
}

main().catch(console.error);
