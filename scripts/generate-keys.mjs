import { randomBytes } from 'crypto';

console.log(' Secure Key Generation');
console.log('═'.repeat(50));
console.log('Copy these into your .env file:\n');

console.log(`JWT_SECRET_CLIENT=${randomBytes(32).toString('hex')}`);
console.log(`JWT_SECRET_ADMIN=${randomBytes(32).toString('hex')}`);
console.log(`REFRESH_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`AUTH_MIGRATION_ADMIN_KEY=${randomBytes(16).toString('hex')}`);
console.log(`POSTIZ_WEBHOOK_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`KORA_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}\n`);

console.log(' Verify:');
console.log('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\').length)"');
console.log('  → should output 64 (for 32-byte hex strings)\n');
