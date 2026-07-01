import { ConvexClient } from 'convex/browser';
import { api } from './convex/_generated/api.js';

const client = new ConvexClient('https://warmhearted-aardvark-280.convex.cloud');

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AUTOMATION SETUP — ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Login
  const login = await client.mutation(api.admin_auth.adminLogin, { email: 'admin@dutchkem.com', password: 'XeHtkj6y%JdFAFe#', deviceId: 'auto-setup' });
  const T = login.token;
  console.log('✅ Admin logged in\n');

  // 1. Enable Ad Orchestrator
  console.log('🔧 Enabling Ad Orchestrator...');
  try {
    const orchResult = await client.mutation(api.adOrchestrator.toggleOrchestrator, {
      enabled: true, autoGenerate: true, autoPost: true, adminToken: T
    });
    console.log('  ✅ Orchestrator:', JSON.stringify(orchResult).substring(0, 100));
  } catch (e) {
    console.log('  ❌ Orchestrator:', e.message.substring(0, 80));
  }

  // 2. Enable Ad Engine
  console.log('\n🔧 Enabling Ad Engine...');
  try {
    const engineResult = await client.mutation(api.adEngine.toggleAdEngine, {
      enabled: true, autoPost: true, adminToken: T
    });
    console.log('  ✅ Ad Engine:', JSON.stringify(engineResult).substring(0, 100));
  } catch (e) {
    console.log('  ❌ Ad Engine:', e.message.substring(0, 80));
  }

  // 3. Initialize Auto Flyer
  console.log('\n🔧 Initializing Auto Flyer...');
  try {
    const flyerInit = await client.mutation(api.flyer_engine.initEngine, {
      postingIntervalHours: 4, adminToken: T
    });
    console.log('  ✅ Flyer Engine Init:', JSON.stringify(flyerInit).substring(0, 100));
  } catch (e) {
    console.log('  ❌ Flyer Engine Init:', e.message.substring(0, 80));
  }

  // 4. Start Auto Flyer
  console.log('\n🔧 Starting Auto Flyer...');
  try {
    const flyerStart = await client.mutation(api.flyer_engine.startEngine, { adminToken: T });
    console.log('  ✅ Flyer Engine Start:', JSON.stringify(flyerStart).substring(0, 100));
  } catch (e) {
    console.log('  ❌ Flyer Engine Start:', e.message.substring(0, 80));
  }

  // 5. Enable Flyer Platforms
  console.log('\n🔧 Enabling Flyer Platforms...');
  const flyerPlatforms = ['linkedin', 'facebook', 'instagram', 'reddit', 'threads'];
  for (const platform of flyerPlatforms) {
    try {
      await client.mutation(api.flyer_engine.togglePlatform, { platform, enabled: true, adminToken: T });
      console.log(`  ✅ Flyer: ${platform} enabled`);
    } catch (e) {
      console.log(`  ❌ Flyer: ${platform} - ${e.message.substring(0, 60)}`);
    }
  }

  // 6. Enable Ad Orchestrator Platforms
  console.log('\n🔧 Enabling Ad Orchestrator Platforms...');
  const orchPlatforms = ['linkedin', 'facebook', 'instagram', 'reddit', 'threads'];
  for (const platform of orchPlatforms) {
    try {
      await client.mutation(api.adOrchestrator.togglePlatform, { platform, enabled: true, adminToken: T });
      console.log(`  ✅ Orchestrator: ${platform} enabled`);
    } catch (e) {
      console.log(`  ❌ Orchestrator: ${platform} - ${e.message.substring(0, 60)}`);
    }
  }

  // 7. Create TryPost brand profile
  console.log('\n🔧 Setting up TryPost brand profile...');
  try {
    const brandResult = await client.mutation(api.trypost.upsertBrandProfile, {
      brandName: 'Dutchkem Ventures ProSuite',
      voice: 'Professional',
      toneKeywords: 'innovative, reliable, African, tech-forward',
      websiteUrl: 'https://dutchkem-prosuite-app.vercel.app',
      adminToken: T
    });
    console.log('  ✅ Brand Profile:', JSON.stringify(brandResult).substring(0, 100));
  } catch (e) {
    console.log('  ❌ Brand Profile:', e.message.substring(0, 80));
  }

  // 8. Generate first flyer batch
  console.log('\n🔧 Generating first flyer batch...');
  try {
    const flyerBatch = await client.mutation(api.flyer_engine.generateFlyerInternal, { adminToken: T });
    console.log('  ✅ Flyer Batch:', JSON.stringify(flyerBatch).substring(0, 100));
  } catch (e) {
    console.log('  ❌ Flyer Batch:', e.message.substring(0, 80));
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AUTOMATION SETUP COMPLETE');
  console.log('  All systems enabled. Cron jobs will handle automated posting.');
  console.log('═══════════════════════════════════════════════════════════════');

  client.close();
}

main();
