const https = require("https");

const token = "r8_9CV0GBQ3gPHLzE5Iz0A4HSyJ8l2oVXG1zYYkQ";
const prompt = "A modern futuristic city skyline with neon lights and digital overlays";

// Test Replicate API
const data = JSON.stringify({
  input: {
    prompt: prompt,
  },
});

const options = {
  hostname: "api.replicate.com",
  path: "/v1/models/minimax/video-01/predictions",
  method: "POST",
  headers: {
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});

req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
