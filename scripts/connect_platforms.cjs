const { Composio } = require("@composio/core");

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const composio = new Composio({ apiKey });
  const session = await composio.create("admin_dutchkem");
  const tools = await session.tools();
  const manageTool = tools.find((t) => t.function?.name === "COMPOSIO_MANAGE_CONNECTIONS");

  // Platforms to connect (excluding Facebook which needs a Business Page)
  const platforms = ["instagram", "twitter", "youtube", "tiktok", "pinterest", "threads", "discord"];

  console.log("Checking connections for all platforms...\n");

  if (manageTool) {
    const connResult = await session.execute("COMPOSIO_MANAGE_CONNECTIONS", {
      toolkits: platforms,
    });

    const resultStr = JSON.stringify(connResult, null, 2);
    console.log(resultStr.substring(0, 5000));

    // Extract auth URLs for platforms that need them
    for (const platform of platforms) {
      const statusMatch = resultStr.match(new RegExp(`"${platform}".*?"status"\\s*:\\s*"([^"]+)"`));
      const status = statusMatch ? statusMatch[1] : "unknown";

      if (status === "initiated") {
        const redirectMatch = resultStr.match(new RegExp(`"${platform}".*?"redirect_url"\\s*:\\s*"([^"]+)"`));
        if (redirectMatch) {
          console.log(`\n🔗 Connect ${platform}: ${redirectMatch[1]}`);
        }
      } else if (status === "active") {
        console.log(`✅ ${platform}: Already connected`);
      }
    }
  }
}

main().catch(console.error);
