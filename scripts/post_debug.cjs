const { Composio } = require("@composio/core");

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const composio = new Composio({ apiKey });
  const session = await composio.create("admin_dutchkem");
  const tools = await session.tools();

  // Search for Facebook posting tools
  console.log("Searching for Facebook posting tools...");
  const searchResult = await session.execute("COMPOSIO_SEARCH_TOOLS", {
    queries: [{ use_case: "post text to Facebook" }],
    session: { generate_id: true },
  });

  console.log(JSON.stringify(searchResult, null, 2).substring(0, 3000));
}

main().catch(console.error);
