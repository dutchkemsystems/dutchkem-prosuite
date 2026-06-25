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
  console.log("=== Checking deployed site ===\n");

  // Check main page
  const mainHtml = await fetchPage("https://dutchkem-prosuite-app.vercel.app");
  console.log("Main page loaded:", mainHtml.length, "bytes");
  console.log("Has DutchKem:", mainHtml.includes("DutchKem"));

  // Check admin dashboard
  const adminHtml = await fetchPage("https://dutchkem-prosuite-app.vercel.app/admin/dashboard");
  console.log("\nAdmin dashboard:", adminHtml.length, "bytes");

  // Check enterprise dashboard
  const entHtml = await fetchPage("https://dutchkem-prosuite-app.vercel.app/enterprise/dashboard");
  console.log("Enterprise dashboard:", entHtml.length, "bytes");

  // Check if JS bundles reference the new files
  const jsFiles = adminHtml.match(/src="([^"]+\.js)"/g) || [];
  console.log("\nAdmin JS bundles:", jsFiles.length);
  jsFiles.slice(0, 5).forEach(f => console.log(" ", f));

  console.log("\n=== Local file verification ===");
  const fs = require("fs");
  const panelContent = fs.readFileSync("C:\\dutchkem-ventures-platform-overview\\src\\components\\admin\\AdminFeaturesPanel.tsx", "utf8");
  console.log("AdminFeaturesPanel has 'getSeededCompanies':", panelContent.includes("getSeededCompanies"));
  console.log("AdminFeaturesPanel has 'listOrganizations':", panelContent.includes("listOrganizations"));
  console.log("AdminFeaturesPanel has 'Company Types':", panelContent.includes("Company Types"));
  console.log("AdminFeaturesPanel has 'Live Orgs':", panelContent.includes("Live Orgs"));

  const portalContent = fs.readFileSync("C:\\dutchkem-ventures-platform-overview\\src\\components\\enterprise\\EnterprisePortalAdmin.tsx", "utf8");
  console.log("\nEnterprisePortalAdmin has 'Deploy Features':", portalContent.includes("Deploy Features"));
  console.log("EnterprisePortalAdmin has 'AdminFeaturesPanel':", portalContent.includes("AdminFeaturesPanel"));

  const clientContent = fs.readFileSync("C:\\dutchkem-ventures-platform-overview\\src\\routes\\enterprise\\dashboard.tsx", "utf8");
  console.log("\nEnterprise Client Dashboard has 'FEATURE_TABS':", clientContent.includes("FEATURE_TABS"));
  console.log("Enterprise Client Dashboard has 'featureConfig':", clientContent.includes("featureConfig"));
  console.log("Enterprise Client Dashboard has 'enabledFeatures':", clientContent.includes("enabledFeatures"));

  // Count company types
  const companyContent = fs.readFileSync("C:\\dutchkem-ventures-platform-overview\\src\\components\\admin\\enterprise\\PortalCompanyManagement.tsx", "utf8");
  const companyCount = (companyContent.match(/\{ id: '/g) || []).length;
  console.log("\nPortalCompanyManagement company types:", companyCount);
}

main().catch(console.error);
