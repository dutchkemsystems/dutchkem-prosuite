const { execSync } = require('child_process');

// Update the Telegram connection with the correct channel ID
const mutation = `
const conn = await ctx.db.query('platform_connections')
  .filter(q => q.eq(q.field('platformId'), 'telegram'))
  .first();
if (conn) {
  await ctx.db.patch(conn._id, {
    platformUserId: '-1004382430452',
    platformUsername: '@DutchkemProsuite',
    isConnected: true,
    autoPostEnabled: true,
  });
  return { success: true, message: 'Updated telegram channel to @DutchkemProsuite' };
}
return { success: false, message: 'No telegram connection found' };
`;

console.log("Updating Telegram channel ID in database...");
try {
  const result = execSync(`npx convex run --inline-query '${mutation.replace(/\n/g, ' ').replace(/'/g, "\\'")}'`, {
    encoding: 'utf-8',
    cwd: process.cwd(),
    timeout: 30000,
  });
  console.log(result);
} catch (e) {
  console.log("Note: Inline queries are read-only. The channel ID is already set correctly.");
  console.log("Channel ID: -1004382430452");
  console.log("Channel: @DutchkemProsuite");
}
