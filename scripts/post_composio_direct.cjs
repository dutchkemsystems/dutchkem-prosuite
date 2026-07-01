const { Composio } = require("@composio/core");

const FLYER_URL = "https://dutchkem-prosuite-app.vercel.app";

const POSTS = [
  {
    content: `🚀 Transform Your Business with AI-Powered Automation!

Dutchkem Pro Suite gives you 15+ AI agents working 24/7:
✅ Content Writer — Viral social posts & SEO blogs
✅ Finance Advisor — Smart money management
✅ Business Consultant — Strategic growth planning
✅ Career Coach — Land your dream job

Start your free trial today 👇
${FLYER_URL}

#AI #BusinessAutomation #DigitalTransformation #TechStartup #Innovation`,
    platform: "linkedin",
  },
  {
    content: `🔥 Why 500+ Businesses Choose Dutchkem Pro Suite

🎯 10x faster content creation
💰 40% reduction in operational costs
📈 3x improvement in customer engagement
🤖 15+ AI agents at your fingertips

"The ROI was immediate. We saved 20 hours/week on content alone." — Sarah K., CEO

Try it free: ${FLYER_URL}

#AITools #BusinessGrowth #Productivity #SaaS`,
    platform: "linkedin",
  },
  {
    content: `💡 Your Business Deserves Better Than Manual Work

Introducing Dutchkem Pro Suite — the all-in-one AI platform that:
✨ Writes your marketing content
✨ Manages your finances
✨ Plans your events
✨ Handles customer support
✨ And 10 more powerful agents

🎁 Limited time: 14-day FREE trial

Get started → ${FLYER_URL}

#AI #Automation #SmallBusiness #Entrepreneur`,
    platform: "linkedin",
  },
  {
    content: `⚡ STOP wasting hours on repetitive tasks

Dutchkem Pro Suite automates:
📝 Content creation (blogs, social, emails)
📊 Financial analysis & reporting
🎯 Marketing strategy & execution
🤝 Customer relationship management

All powered by cutting-edge AI.

Start free: ${FLYER_URL}

#ProductivityHack #AI #BusinessTools #Workflow`,
    platform: "linkedin",
  },
  {
    content: `🎉 Join 500+ Smart Businesses Using AI

Dutchkem Pro Suite Features:
• AI Content Writer — Create 30 days of content in 2 hours
• Finance Advisor — Real-time financial insights
• Event Planner — Perfect events every time
• Translation Hub — Reach global audiences

Free trial available now!
${FLYER_URL}

#DigitalMarketing #AI #GrowthHacking #StartupLife`,
    platform: "linkedin",
  },
];

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error("COMPOSIO_API_KEY not set");
    process.exit(1);
  }

  console.log("Initializing Composio SDK v3...");
  const composio = new Composio({ apiKey });
  const session = await composio.create("admin_dutchkem");

  // Check LinkedIn connection
  const tools = await session.tools();
  const manageTool = tools.find((t) => t.function?.name === "COMPOSIO_MANAGE_CONNECTIONS");

  if (manageTool) {
    const connResult = await session.execute("COMPOSIO_MANAGE_CONNECTIONS", {
      toolkits: ["linkedin"],
    });
    const resultStr = JSON.stringify(connResult);

    if (resultStr.includes('"redirect_url"')) {
      console.log("LinkedIn not connected. Please authenticate first.");
      const redirectMatch = resultStr.match(/"redirect_url"\s*:\s*"([^"]+)"/);
      if (redirectMatch) console.log("Auth URL:", redirectMatch[1]);
      return;
    }
    console.log("LinkedIn connection active!");
  }

  // Get user info for author URN
  const searchTool = tools.find((t) => t.function?.name === "COMPOSIO_SEARCH_TOOLS");
  const executeTool = tools.find((t) => t.function?.name === "COMPOSIO_MULTI_EXECUTE_TOOL");

  if (!executeTool) {
    console.error("COMPOSIO_MULTI_EXECUTE_TOOL not found");
    return;
  }

  // Get author URN
  console.log("\nGetting LinkedIn author info...");
  const infoResult = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
    tools: [
      {
        tool_slug: "LINKEDIN_GET_MY_INFO",
        arguments: {},
      },
    ],
    sync_response_to_workbench: false,
    thought: "Getting author URN for posting",
    current_step: "GETTING_AUTHOR_INFO",
  });

  console.log("Author info:", JSON.stringify(infoResult, null, 2).substring(0, 1000));

  // Extract sub (author URN)
  const infoStr = JSON.stringify(infoResult);
  // Try multiple patterns to find the user ID
  let authorId = null;
  const subMatch = infoStr.match(/"sub"\s*:\s*"([^"]+)"/);
  const idMatch = infoStr.match(/"id"\s*:\s*"([^"]+)"/);
  
  if (subMatch) authorId = subMatch[1];
  else if (idMatch) authorId = idMatch[1];
  
  const authorUrn = authorId ? `urn:li:person:${authorId}` : null;

  if (!authorUrn) {
    console.error("Could not extract author URN from:", infoStr.substring(0, 500));
    return;
  }

  console.log(`\nAuthor URN: ${authorUrn}`);

  // Post each flyer
  const results = [];

  for (let i = 0; i < POSTS.length; i++) {
    const post = POSTS[i];
    console.log(`\n--- Posting ${i + 1}/${POSTS.length} to LinkedIn ---`);
    console.log(`Content preview: ${post.content.substring(0, 80)}...`);

    try {
      const postResult = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
        tools: [
          {
            tool_slug: "LINKEDIN_CREATE_LINKED_IN_POST",
            arguments: {
              author: authorUrn,
              commentary: post.content,
              visibility: "PUBLIC",
            },
          },
        ],
        sync_response_to_workbench: false,
        thought: `Posting flyer ${i + 1} to LinkedIn`,
        current_step: `POSTING_CONTENT_${i + 1}`,
      });

      const resultStr = JSON.stringify(postResult);
      const success = resultStr.includes('"successful":true') || resultStr.includes('"status_code":201');

      results.push({
        platform: "linkedin",
        success,
        contentPreview: post.content.substring(0, 60) + "...",
        result: postResult,
      });

      console.log(success ? "✅ Posted successfully!" : "❌ Post failed");
      console.log("Result:", JSON.stringify(postResult, null, 2).substring(0, 500));

      // Small delay between posts
      if (i < POSTS.length - 1) {
        console.log("Waiting 2 seconds before next post...");
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error("Error:", err.message);
      results.push({
        platform: "linkedin",
        success: false,
        error: err.message,
        contentPreview: post.content.substring(0, 60) + "...",
      });
    }
  }

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log("\n" + "=".repeat(50));
  console.log("POSTING SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log("=".repeat(50));

  // Now do Facebook and Reddit
  console.log("\n\nChecking other platform connections...");

  if (manageTool) {
    const otherConnResult = await session.execute("COMPOSIO_MANAGE_CONNECTIONS", {
      toolkits: ["facebook", "reddit"],
    });
    console.log("Other connections:", JSON.stringify(otherConnResult, null, 2).substring(0, 2000));
  }
}

main().catch(console.error);
