const { ConvexClient } = require("convex/browser");

const ALL_IDS = [
  "S1","S2","S3","S4","S5","M1","M2","M3","M4","M5",
  "H1","H2","H3","H4","H5","H6","H7","H8","H9","H10",
  "HC11","HC12","HC13","HC14","HC15","HC16","HC17","HC18","HC19","HC20",
  "ED11","ED12","ED13","ED14","ED15","ED16","ED17","ED18","ED19","ED20",
  "TECH11","TECH12","TECH13","TECH14","TECH15","TECH16","TECH17","TECH18","TECH19","TECH20",
  "FIN11","FIN12","FIN13","FIN14","FIN15","FIN16","FIN17","FIN18","FIN19","FIN20",
  "RE11","RE12","RE13","RE14","RE15","RE16","RE17","RE18","RE19","RE20",
  "MF11","MF12","MF13","MF14","MF15","MF16","MF17","MF18","MF19","MF20",
  "LG11","LG12","LG13","LG14","LG15","LG16","LG17","LG18","LG19","LG20",
  "RT11","RT12","RT13","RT14","RT15","RT16","RT17","RT18","RT19","RT20",
  "HO11","HO12","HO13","HO14","HO15","HO16","HO17","HO18","HO19","HO20",
  "LG21","LG22","LG23","LG24","LG25","LG26","LG27","LG28","LG29","LG30",
  "AG11","AG12","AG13","AG14","AG15","AG16","AG17","AG18","AG19","AG20",
  "EP21","EP22","EP23","EP24","EP25","EP26","EP27","EP28","EP29","EP30",
  "ME21","ME22","ME23","ME24","ME25","ME26","ME27","ME28","ME29","ME30",
  "GOV21","GOV22","GOV23","GOV24","GOV25","GOV26","GOV27","GOV28","GOV29","GOV30",
  "NP21","NP22","NP23","NP24","NP25","NP26","NP27","NP28","NP29","NP30",
  "MN21","MN22","MN23","MN24","MN25","MN26","MN27","MN28","MN29","MN30",
  "AU21","AU22","AU23","AU24","AU25","AU26","AU27","AU28","AU29","AU30",
  "SR21","SR22","SR23","SR24","SR25","SR26","SR27","SR28","SR29","SR30",
  "FB31","FB32","FB33","FB34","FB35","FB36","FB37","FB38","FB39","FB40",
  "TC41","TC42","TC43","TC44","TC45","TC46","TC47","TC48","TC49","TC50",
  "INS51","INS52","INS53","INS54","INS55","INS56","INS57","INS58","INS59","INS60",
  "ENV61","ENV62","ENV63","ENV64","ENV65","ENV66","ENV67","ENV68","ENV69","ENV70",
  "PS71","PS72","PS73","PS74","PS75","PS76","PS77","PS78","PS79","PS80",
  "TR81","TR82","TR83","TR84","TR85","TR86","TR87","TR88","TR89","TR90",
  "FNB91","FNB92","FNB93","FNB94","FNB95","FNB96","FNB97","FNB98","FNB99","FNB100",
  "DEF101","DEF102","DEF103","DEF104","DEF105","DEF106","DEF107","DEF108","DEF109","DEF110",
  "AE111","AE112","AE113","AE114","AE115","AE116","AE117","AE118","AE119","AE120",
  "MS121","MS122","MS123","MS124","MS125","MS126","MS127","MS128","MS129","MS130"
];

async function main() {
  const client = new ConvexClient("https://warmhearted-aardvark-280.convex.cloud");
  const BATCH_SIZE = 50;
  let totalCreated = 0;
  let totalSkipped = 0;

  console.log(`Seeding ${ALL_IDS.length} companies in batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < ALL_IDS.length; i += BATCH_SIZE) {
    const batch = ALL_IDS.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const result = await client.mutation("seed_companies:seedBatch", {
        companyIds: batch,
        adminToken: "qn73vh7zdwbyx7857h06r2a7f9893d06",
      });
      totalCreated += result.created;
      totalSkipped += result.skipped;
      process.stdout.write(`Batch ${batchNum}: +${result.created} (skip ${result.skipped}) `);
    } catch (e) {
      process.stdout.write(`Batch ${batchNum}: ERROR ${e.message} `);
    }
  }

  console.log(`\n\nSeeding complete!`);
  console.log(`  Created: ${totalCreated}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Total: ${totalCreated + totalSkipped}`);

  const count = await client.query("seed_companies:getSeededCount", {});
  console.log(`  In DB: ${count.configs} feature configs`);

  // Verify a few companies
  console.log("\nVerification:");
  for (const id of ["S1", "TECH13", "H5", "AE112", "MS130"]) {
    const enabled = await client.query("enterprise_features:isFeatureEnabled", { orgId: id, featureId: "orders" });
    console.log(`  ${id} orders: ${enabled ? "✅" : "❌"}`);
  }

  client.close();
}

main().catch(console.error);
