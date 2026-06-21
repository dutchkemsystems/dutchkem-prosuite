import { ConvexClient } from 'convex/browser';
import { api } from './convex/_generated/api.js';
const client = new ConvexClient('https://warmhearted-aardvark-280.convex.cloud');
try {
  const login = await client.mutation(api.admin_auth.adminLogin, { email: 'admin@dutchkem.com', password: 'XeHtkj6y%JdFAFe#', deviceId: 'debug' });
  const T = login.token;
  const dash = await client.query(api.dashboard.getDashboardData, {});
  const userId = dash.user._id;
  console.log('User ID:', userId);
  
  console.log('\n=== CreditBalance API calls ===');
  try { const r = await client.query(api.revenue_credits.getCreditBalance, { userId }); console.log('getCreditBalance:', JSON.stringify(r).substring(0, 150)); } catch(e) { console.log('getCreditBalance ERROR:', e.message); }
  try { const r = await client.query(api.revenue_growth.getCreditExpiryConfig); console.log('getCreditExpiryConfig:', JSON.stringify(r).substring(0, 150)); } catch(e) { console.log('getCreditExpiryConfig ERROR:', e.message); }
  try { const r = await client.query(api.revenue_growth.getExpiringCredits, { userId }); console.log('getExpiringCredits:', JSON.stringify(r).substring(0, 150)); } catch(e) { console.log('getExpiringCredits ERROR:', e.message); }
  try { const r = await client.query(api.revenue_credits.getCreditTransactions, { userId, limit: 10 }); console.log('getCreditTransactions:', JSON.stringify(r).substring(0, 150)); } catch(e) { console.log('getCreditTransactions ERROR:', e.message); }
  
  console.log('\n=== UsageTracker API calls ===');
  try { const r = await client.query(api.revenue_growth.getUsageTracking, { userId }); console.log('getUsageTracking:', JSON.stringify(r).substring(0, 150)); } catch(e) { console.log('getUsageTracking ERROR:', e.message); }
  
  console.log('\n=== Security data ===');
  console.log('Sessions:', JSON.stringify(dash.sessions).substring(0, 200));
  
  console.log('\n=== Settings data ===');
  console.log('User:', JSON.stringify(dash.user).substring(0, 200));
  
  console.log('\n✅ All checks complete');
} catch (e) {
  console.error('Error:', e.message);
}
client.close();
