const https = require("https");

const token = process.env.REPLICATE_API_TOKEN || "";
if (!token) {
  throw new Error("REPLICATE_API_TOKEN environment variable is not set");
}
const predId = "wyk9tpvvtsrmy0cyzq3smf023g";

function poll() {
  const options = {
    hostname: "api.replicate.com",
    path: `/v1/predictions/${predId}`,
    method: "GET",
    headers: { "Authorization": `Token ${token}` },
  };

  const req = https.request(options, (res) => {
    let body = "";
    res.on("data", (chunk) => body += chunk);
    res.on("end", () => {
      const data = JSON.parse(body);
      console.log(`Status: ${data.status}`);
      if (data.status === "succeeded") {
        console.log("OUTPUT:", JSON.stringify(data.output));
        process.exit(0);
      } else if (data.status === "failed" || data.status === "canceled") {
        console.log("FAILED:", data.error);
        process.exit(1);
      } else {
        console.log("Waiting 10s...");
        setTimeout(poll, 10000);
      }
    });
  });

  req.on("error", (e) => console.error("Error:", e.message));
  req.end();
}

poll();
