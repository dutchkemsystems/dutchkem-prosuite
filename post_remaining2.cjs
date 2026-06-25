const { Composio } = require("@composio/core");

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const composio = new Composio({ apiKey });
  const session = await composio.create("admin_dutchkem");
  const tools = await session.tools();
  const executeTool = tools.find((t) => t.function?.name === "COMPOSIO_MULTI_EXECUTE_TOOL");

  // Search for Instagram posting tools (not comments)
  console.log("=== Searching Instagram tools ===");
  const igSearch = await session.execute("COMPOSIO_SEARCH_TOOLS", {
    queries: [
      { use_case: "create Instagram post with image and caption" },
      { use_case: "publish Instagram reel or story" },
    ],
    session: { generate_id: true },
  });
  const igStr = JSON.stringify(igSearch);
  const igTools = igStr.match(/"tool_slug"\s*:\s*"INSTAGRAM_[^"]+"/g)?.map(m => m.match(/"([^"]+)"$/)[1]) || [];
  console.log("Instagram tools found:", [...new Set(igTools)].join(", "));

  // Search for YouTube community post tools
  console.log("\n=== Searching YouTube tools ===");
  const ytSearch = await session.execute("COMPOSIO_SEARCH_TOOLS", {
    queries: [
      { use_case: "create YouTube community post" },
      { use_case: "upload video to YouTube" },
    ],
    session: { generate_id: true },
  });
  const ytStr = JSON.stringify(ytSearch);
  const ytTools = ytStr.match(/"tool_slug"\s*:\s*"YOUTUBE_[^"]+"/g)?.map(m => m.match(/"([^"]+)"$/)[1]) || [];
  console.log("YouTube tools found:", [...new Set(ytTools)].join(", "));
}

main().catch(console.error);
