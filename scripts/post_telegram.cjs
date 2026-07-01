const FLYER_URL = "https://dutchkem-prosuite-app.vercel.app";
const BOT_TOKEN = "8867377741:AAEgaGAezFRI8iTgbRr2dvBzWvJiP2McofE";
const CHANNEL_ID = "-1004382430452";

const POSTS = [
  `🚀 Transform Your Business with AI-Powered Automation!

Dutchkem Pro Suite gives you 15+ AI agents working 24/7:
✅ Content Writer — Viral social posts & SEO blogs
✅ Finance Advisor — Smart money management
✅ Business Consultant — Strategic growth planning
✅ Career Coach — Land your dream job

Start your free trial today 👇
${FLYER_URL}

#AI #BusinessAutomation #DigitalTransformation #TechStartup #Innovation`,

  `🔥 Why 500+ Businesses Choose Dutchkem Pro Suite

🎯 10x faster content creation
💰 40% reduction in operational costs
📈 3x improvement in customer engagement
🤖 15+ AI agents at your fingertips

"The ROI was immediate. We saved 20 hours/week on content alone." — Sarah K., CEO

Try it free: ${FLYER_URL}

#AITools #BusinessGrowth #Productivity #SaaS`,

  `💡 Your Business Deserves Better Than Manual Work

Introducing Dutchkem Pro Suite — the all-in-one AI platform that:
✨ Writes your marketing content
✨ Manages your finances
✨ Plans your events
✨ Handles customer support
✨ And 10 more powerful agents

🎁 Limited time: 14-day FREE trial

Get started → ${FLYER_URL}

#AI #Automation #SmallBusiness #Entrepreneur`,

  `⚡ STOP wasting hours on repetitive tasks

Dutchkem Pro Suite automates:
📝 Content creation (blogs, social, emails)
📊 Financial analysis & reporting
🎯 Marketing strategy & execution
🤝 Customer relationship management

All powered by cutting-edge AI.

Start free: ${FLYER_URL}

#ProductivityHack #AI #BusinessTools #Workflow`,

  `🎉 Join 500+ Smart Businesses Using AI

Dutchkem Pro Suite Features:
• AI Content Writer — Create 30 days of content in 2 hours
• Finance Advisor — Real-time financial insights
• Event Planner — Perfect events every time
• Translation Hub — Reach global audiences

Free trial available now!
${FLYER_URL}

#DigitalMarketing #AI #GrowthHacking #StartupLife`,
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("Posting 5 flyers to Telegram channel @DutchkemProsuite...\n");

  const results = [];

  for (let i = 0; i < POSTS.length; i++) {
    const post = POSTS[i];
    console.log(`--- Post ${i + 1}/${POSTS.length} ---`);

    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHANNEL_ID,
          text: post,
          parse_mode: "HTML",
        }),
      });

      const data = await res.json();

      if (data.ok) {
        console.log(`  ✅ Posted! Message ID: ${data.result.message_id}`);
        results.push({ success: true, messageId: data.result.message_id });
      } else {
        console.log(`  ❌ Failed: ${data.description}`);
        results.push({ success: false, error: data.description });
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      results.push({ success: false, error: err.message });
    }

    await sleep(2000);
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log("\n" + "=".repeat(50));
  console.log("TELEGRAM POSTING SUMMARY");
  console.log("=".repeat(50));
  console.log(`Channel: @DutchkemProsuite`);
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
