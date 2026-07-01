const { Composio } = require("@composio/core");

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const composio = new Composio({ apiKey });
  const session = await composio.create("admin_dutchkem");
  const tools = await session.tools();
  const executeTool = tools.find((t) => t.function?.name === "COMPOSIO_MULTI_EXECUTE_TOOL");

  console.log("Fetching stats from all connected platforms...\n");

  // LinkedIn Stats
  console.log("=== LINKEDIN ===");
  try {
    const linkedinInfo = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
      tools: [{ tool_slug: "LINKEDIN_GET_MY_INFO", arguments: {} }],
      sync_response_to_workbench: false, thought: "Getting LinkedIn info", current_step: "LINKEDIN",
    });
    const liStr = JSON.stringify(linkedinInfo);
    const liName = liStr.match(/"localizedFirstName"\s*:\s*"([^"]+)"/)?.[1];
    const liLastName = liStr.match(/"localizedLastName"\s*:\s*"([^"]+)"/)?.[1];
    console.log(`  Name: ${liName} ${liLastName}`);

    // Try to get follower count
    const liProfile = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
      tools: [{ tool_slug: "LINKEDIN_GET_ORGANIZATION_INFO", arguments: {} }],
      sync_response_to_workbench: false, thought: "Getting LinkedIn followers", current_step: "LI_FOLLOWERS",
    });
    console.log(`  Profile: ${JSON.stringify(liProfile).substring(0, 500)}`);
  } catch (e) { console.log(`  Error: ${e.message.substring(0, 100)}`); }

  // Instagram Stats
  console.log("\n=== INSTAGRAM ===");
  try {
    const igInfo = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
      tools: [{ tool_slug: "INSTAGRAM_GET_USER_INFO", arguments: {} }],
      sync_response_to_workbench: false, thought: "Getting Instagram info", current_step: "INSTAGRAM",
    });
    const igStr = JSON.stringify(igInfo);
    const igFollowers = igStr.match(/"followers_count"\s*:\s*(\d+)/)?.[1];
    const igFollowing = igStr.match(/"follows_count"\s*:\s*(\d+)/)?.[1];
    const igMedia = igStr.match(/"media_count"\s*:\s*(\d+)/)?.[1];
    const igBio = igStr.match(/"biography"\s*:\s*"([^"]+)"/)?.[1];
    console.log(`  Followers: ${igFollowers || "N/A"}`);
    console.log(`  Following: ${igFollowing || "N/A"}`);
    console.log(`  Posts: ${igMedia || "N/A"}`);
    console.log(`  Bio: ${igBio || "N/A"}`);
  } catch (e) { console.log(`  Error: ${e.message.substring(0, 100)}`); }

  // YouTube Stats
  console.log("\n=== YOUTUBE ===");
  try {
    const ytInfo = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
      tools: [{ tool_slug: "YOUTUBE_GET_CHANNEL_STATISTICS", arguments: {} }],
      sync_response_to_workbench: false, thought: "Getting YouTube stats", current_step: "YOUTUBE",
    });
    console.log(`  Stats: ${JSON.stringify(ytInfo).substring(0, 1000)}`);
  } catch (e) { console.log(`  Error: ${e.message.substring(0, 100)}`); }

  // Discord Stats
  console.log("\n=== DISCORD ===");
  try {
    const dcInfo = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
      tools: [{ tool_slug: "DISCORD_LIST_MY_GUILDS", arguments: {} }],
      sync_response_to_workbench: false, thought: "Getting Discord info", current_step: "DISCORD",
    });
    const dcStr = JSON.stringify(dcInfo);
    const guildMatch = dcStr.match(/"name"\s*:\s*"([^"]+)"/);
    const memberMatch = dcStr.match(/"approximate_member_count"\s*:\s*(\d+)/);
    console.log(`  Server: ${guildMatch?.[1] || "N/A"}`);
    console.log(`  Members: ${memberMatch?.[1] || "N/A"}`);
  } catch (e) { console.log(`  Error: ${e.message.substring(0, 100)}`); }

  // Reddit Stats
  console.log("\n=== REDDIT ===");
  try {
    const rdInfo = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
      tools: [{ tool_slug: "REDDIT_GET_MY_PROFILE", arguments: {} }],
      sync_response_to_workbench: false, thought: "Getting Reddit info", current_step: "REDDIT",
    });
    console.log(`  Profile: ${JSON.stringify(rdInfo).substring(0, 1000)}`);
  } catch (e) { console.log(`  Error: ${e.message.substring(0, 100)}`); }

  // Telegram Stats
  console.log("\n=== TELEGRAM ===");
  try {
    const tgInfo = await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
      tools: [{ tool_slug: "TELEGRAM_GET_ME", arguments: {} }],
      sync_response_to_workbench: false, thought: "Getting Telegram info", current_step: "TELEGRAM",
    });
    console.log(`  Bot: ${JSON.stringify(tgInfo).substring(0, 500)}`);
  } catch (e) { console.log(`  Error: ${e.message.substring(0, 100)}`); }
}

main().catch(console.error);
