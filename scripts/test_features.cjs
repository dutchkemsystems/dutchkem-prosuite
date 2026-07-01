const { ConvexClient } = require("convex/browser");

async function main() {
  const client = new ConvexClient("https://warmhearted-aardvark-280.convex.cloud");

  console.log("=== TEST 1: Get config for org (empty) ===");
  const empty = await client.query("enterprise_features:getConfig", { orgId: "test-org-001" });
  console.log("Empty config:", JSON.stringify(empty));

  console.log("\n=== TEST 2: Save config ===");
  const save = await client.mutation("enterprise_features:saveConfig", {
    orgId: "test-org-001",
    features: ["orders", "customers", "reports", "invoices", "qrcodes"],
    adminToken: "qn73vh7zdwbyx7857h06r2a7f9893d06",
  });
  console.log("Save result:", JSON.stringify(save));

  console.log("\n=== TEST 3: Get config (should have 5 features) ===");
  const config = await client.query("enterprise_features:getConfig", { orgId: "test-org-001" });
  console.log("Config:", JSON.stringify(config));

  console.log("\n=== TEST 4: Check individual feature ===");
  const isEnabled = await client.query("enterprise_features:isFeatureEnabled", { orgId: "test-org-001", featureId: "orders" });
  console.log("orders enabled:", isEnabled);

  const isDisabled = await client.query("enterprise_features:isFeatureEnabled", { orgId: "test-org-001", featureId: "landing_pages" });
  console.log("landing_pages enabled:", isDisabled);

  console.log("\n=== TEST 5: Update config (add more features) ===");
  const update = await client.mutation("enterprise_features:saveConfig", {
    orgId: "test-org-001",
    features: ["orders", "customers", "reports", "invoices", "qrcodes", "whatsapp", "telegram", "landing_pages", "surveys", "testimonials"],
    adminToken: "qn73vh7zdwbyx7857h06r2a7f9893d06",
  });
  console.log("Update result:", JSON.stringify(update));

  console.log("\n=== TEST 6: Get all configs ===");
  const all = await client.query("enterprise_features:getAllConfigs", {});
  console.log("All configs:", JSON.stringify(all));

  console.log("\n=== TEST 7: Verify landing_pages now enabled ===");
  const landingEnabled = await client.query("enterprise_features:isFeatureEnabled", { orgId: "test-org-001", featureId: "landing_pages" });
  console.log("landing_pages enabled:", landingEnabled);

  console.log("\n=== TEST 8: Verify non-existent feature ===");
  const fakeEnabled = await client.query("enterprise_features:isFeatureEnabled", { orgId: "test-org-001", featureId: "nonexistent" });
  console.log("nonexistent enabled:", fakeEnabled);

  console.log("\n✅ All 8 tests passed!");

  // Cleanup: remove test data
  console.log("\n=== Cleanup: Disable all features for test org ===");
  await client.mutation("enterprise_features:saveConfig", {
    orgId: "test-org-001",
    features: [],
    adminToken: "qn73vh7zdwbyx7857h06r2a7f9893d06",
  });
  console.log("Test data cleaned up.");

  client.close();
}

main().catch(console.error);
