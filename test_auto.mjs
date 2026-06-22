import { ConvexClient } from 'convex/browser';
import { api } from './convex/_generated/api.js';

const client = new ConvexClient('https://warmhearted-aardvark-280.convex.cloud');

async function main() {
  const login = await client.mutation(api.admin_auth.adminLogin, { email: 'admin@dutchkem.com', password: 'XeHtkj6y%JdFAFe#', deviceId: 'test' });
  const T = login.token;

  // Test initEngine (no adminToken)
  console.log('Testing initEngine...');
  try {
    const r = await client.mutation(api.flyer_engine.initEngine, { postingIntervalHours: 4 });
    console.log('✅ initEngine:', r);
  } catch (e) { console.log('❌ initEngine:', e.message.substring(0, 120)); }

  // Test adEngine toggleAdEngine (only enabled, not autoPost)
  console.log('\nTesting toggleAdEngine...');
  try {
    const r = await client.mutation(api.adEngine.toggleAdEngine, { enabled: true, adminToken: T });
    console.log('✅ toggleAdEngine:', r);
  } catch (e) { console.log('❌ toggleAdEngine:', e.message.substring(0, 120)); }

  // Test trypost upsertBrandProfile
  console.log('\nTesting upsertBrandProfile...');
  try {
    const r = await client.mutation(api.trypost.upsertBrandProfile, {
      brandName: 'Dutchkem Ventures', voice: 'Professional',
      toneKeywords: ['innovative', 'reliable', 'African', 'tech-forward'],
      targetAudience: 'Nigerian businesses and professionals',
      websiteUrl: 'https://dutchkem-prosuite-app.vercel.app',
      adminToken: T
    });
    console.log('✅ upsertBrandProfile:', JSON.stringify(r).substring(0, 100));
  } catch (e) { console.log('❌ upsertBrandProfile:', e.message.substring(0, 120)); }

  client.close();
}
main();
