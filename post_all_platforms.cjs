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

const PLATFORMS = [
  { id: "linkedin", tool: "LINKEDIN_CREATE_LINKED_IN_POST", getArgs: (content, author) => ({ author, commentary: content, visibility: "PUBLIC" }) },
  { id: "reddit", tool: "REDDIT_CREATE_REDDIT_POST", getArgs: (content) => ({ subreddit: "artificial", title: "Dutchkem Pro Suite - AI Business Automation", text: content }) },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const composio = new Composio({ apiKey });
  const session = await composio.create("admin_dutchkem");
  const tools = await session.tools();
  const executeTool = tools.find((t) => t.function?.name === "COMPOSIO_MULTI_EXECUTE_TOOL");

  // Get LinkedIn author
  console.log("Getting LinkedIn author...");
  const infoResult = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
    tools: [{ tool_slug: "LINKEDIN_GET_MY_INFO", arguments: {} }],
    sync_response_to_workbench: false, thought: "Getting author", current_step: "AUTHOR",
  });
  const linkedinAuthor = `urn:li:person:${JSON.stringify(infoResult).match(/"id"\s*:\s*"([^"]+)"/)[1]}`;
  console.log(`LinkedIn author: ${linkedinAuthor}`);

  const allResults = [];

  for (let i = 0; i < POSTS.length; i++) {
    const post = POSTS[i];
    console.log(`\n--- Post ${i + 1}/${POSTS.length} ---`);

    for (const platform of PLATFORMS) {
      try {
        const args = platform.getArgs(post.content, linkedinAuthor);
        const result = await executeTool
          ? await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
              tools: [{ tool_slug: platform.tool, arguments: args }],
              sync_response_to_workbench: false,
              thought: `Posting to ${platform.id}`,
              current_step: `POSTING_${platform.id.toUpperCase()}_${i + 1}`,
            })
          : null;

        const resultStr = JSON.stringify(result);
        const success = resultStr.includes('"successful":true');
        const error = resultStr.match(/"error"\s*:\s*"([^"]+)"/);

        allResults.push({ platform: platform.id, postIndex: i + 1, success, error: error ? error[1] : null });
        console.log(`  ${platform.id}: ${success ? "✅" : "❌"}${error ? " " + error[1].substring(0, 80) : ""}`);

        await sleep(platform.id === "linkedin" ? 5000 : 2000);
      } catch (err) {
        console.error(`  ${platform.id}: ❌ ${err.message.substring(0, 100)}`);
        allResults.push({ platform: platform.id, postIndex: i + 1, success: false, error: err.message });
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("FINAL POSTING SUMMARY");
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
