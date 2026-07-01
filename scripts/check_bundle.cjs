const https = require("https");

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function main() {
  const html = await fetchPage("https://dutchkem-prosuite-app.vercel.app");
  const bundleMatch = html.match(/assets\/(index-[A-Za-z0-9]+)\.js/);
  console.log("Deployed bundle:", bundleMatch ? bundleMatch[1] : "unknown");

  if (bundleMatch) {
    const jsUrl = "https://dutchkem-prosuite-app.vercel.app/assets/" + bundleMatch[1] + ".js";
    const jsContent = await fetchPage(jsUrl);
    console.log("Bundle size:", jsContent.length, "bytes");
    console.log("Has getSeededCompanies:", jsContent.includes("getSeededCompanies"));
    console.log("Has Deploy Features:", jsContent.includes("Deploy Features"));
    console.log("Has FEATURE_TABS:", jsContent.includes("FEATURE_TABS"));
    console.log("Has AdminFeaturesPanel:", jsContent.includes("AdminFeaturesPanel"));
    console.log("Has Company Types:", jsContent.includes("Company Types"));
    console.log("Has enabledFeatures:", jsContent.includes("enabledFeatures"));
    console.log("Has featureConfig:", jsContent.includes("featureConfig"));
  }
}

main().catch(console.error);
