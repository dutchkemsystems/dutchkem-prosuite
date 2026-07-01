const { ConvexClient } = require("convex/browser");

async function main() {
  const client = new ConvexClient("https://warmhearted-aardvark-280.convex.cloud");

  console.log("Testing enhanced pipeline with sound + long duration...");
  console.log("Generating 30-second video with narration...\n");

  try {
    const result = await client.action("video_production:produceFullVideo", {
      prompt: "A promotional video for DutchKem Prosuite AI platform for African businesses",
      genre: "promotional",
      targetDuration: 30,
      quality: "hd",
      includeAudio: true,
      adminToken: "qn73vh7zdwbyx7857h06r2a7f9893d06",
    });

    console.log("=== RESULT ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }

  client.close();
}

main().catch(console.error);
