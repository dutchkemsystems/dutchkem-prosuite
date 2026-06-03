// ═══════════════════════════════════════════════════════════════════
// VAPID Key Generation Script
// Run: node scripts/generate-vapid-keys.js
// ═══════════════════════════════════════════════════════════════════

const webpush = require("web-push");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║           VAPID Keys Generated Successfully                 ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log("║ Add these to your .env.local file:                          ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_EMAIL=mailto:admin@dutchkemventures.com`);
console.log("");
