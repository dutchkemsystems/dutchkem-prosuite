const { Composio } = require("@composio/core");

const FLYER_URL = "https://dutchkem-prosuite-app.vercel.app";
// Direct image URL from Pexels (no query params)
const IMAGE_URL = "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg";

const CAPTION = `🚀 Transform Your Business with AI-Powered Automation!

Dutchkem Pro Suite gives you 15+ AI agents working 24/7:
✅ Content Writer — Viral social posts & SEO blogs
✅ Finance Advisor — Smart money management
✅ Business Consultant — Strategic growth planning
✅ Career Coach — Land your dream job

Start your free trial today 👇
${FLYER_URL}

#AI #BusinessAutomation #DigitalTransformation #TechStartup #Innovation #DigitalMarketing #ArtificialIntelligence #SmallBusiness #Entrepreneur #TechStartup`;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const composio = new Composio({ apiKey });
  const session = await composio.create("admin_dutchkem");
  const tools = await session.tools();
  const executeTool = tools.find((t) => t.function?.name === "COMPOSIO_MULTI_EXECUTE_TOOL");

  // Get Instagram user info
  console.log("Getting Instagram user info...");
  const userInfo = await executeTool
    ? await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
        tools: [{ tool_slug: "INSTAGRAM_GET_USER_INFO", arguments: {} }],
        sync_response_to_workbench: false,
        thought: "Getting Instagram user ID",
        current_step: "GET_USER_INFO",
      })
    : null;

  const userStr = JSON.stringify(userInfo);
  const userIdMatch = userStr.match(/"id"\s*:\s*"(\d+)"/);
  const igUserId = userIdMatch ? userIdMatch[1] : null;

  if (!igUserId) {
    console.error("Could not get Instagram user ID");
    return;
  }

  console.log(`Instagram user ID: ${igUserId}`);
  await sleep(2000);

  // Step 1: Create media container
  console.log("\nCreating Instagram media container...");
  console.log(`Image URL: ${IMAGE_URL}`);
  const createResult = await executeTool
    ? await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
        tools: [{
          tool_slug: "INSTAGRAM_POST_IG_USER_MEDIA",
          arguments: {
            ig_user_id: igUserId,
            image_url: IMAGE_URL,
            caption: CAPTION,
          },
        }],
        sync_response_to_workbench: false,
        thought: "Creating Instagram media container",
        current_step: "CREATE_CONTAINER",
      })
    : null;

  console.log("Create result:", JSON.stringify(createResult, null, 2).substring(0, 1500));

  const createStr = JSON.stringify(createResult);
  const containerMatch = createStr.match(/"id"\s*:\s*"(\d+)"/);
  const containerId = containerMatch ? containerMatch[1] : null;

  if (!containerId) {
    console.error("Failed to get container ID");
    return;
  }

  console.log(`\nContainer ID: ${containerId}`);
  console.log("Waiting 5 seconds for container to be ready...");
  await sleep(5000);

  // Step 2: Publish
  console.log("\nPublishing Instagram post...");
  const publishResult = await executeTool
    ? await session.execute("COMPOSIO_MULTI_EXECUTE_TOOL", {
        tools: [{
          tool_slug: "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH",
          arguments: {
            ig_user_id: igUserId,
            creation_id: containerId,
          },
        }],
        sync_response_to_workbench: false,
        thought: "Publishing Instagram post",
        current_step: "PUBLISH",
      })
    : null;

  console.log("Publish result:", JSON.stringify(publishResult, null, 2).substring(0, 1000));

  const publishStr = JSON.stringify(publishResult);
  const success = publishStr.includes('"successful":true');
  console.log(`\nInstagram post: ${success ? "✅ Published!" : "❌ Failed"}`);
}

main().catch(console.error);
