#!/usr/bin/env node

/**
 * Dutchkem Ventures ProSuite NG+
 * Admin User Creation Script
 * 
 * Usage:
 *   npm run create-admin
 *   OR
 *   ADMIN_EMAIL=admin@dutchkem.com ADMIN_PASSWORD=SecurePass123! node scripts/create-admin.js
 */

const readline = require('readline');
const crypto = require('crypto');

// Simulated bcrypt (in production, use actual bcrypt)
function hashPassword(password) {
  // In production: return bcrypt.hashSync(password, 12);
  return crypto.createHash('sha256').update(password + 'dutchkem_salt').digest('hex');
}

// Generate MFA secret (base32 encoded)
function generateMFASecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

// Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate password strength
function isStrongPassword(password) {
  // At least 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const minLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
}

async function createAdmin() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     DUTCHKEM VENTURES PROSUITE NG+ - ADMIN CREATION       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 DEFAULT ADMIN CREDENTIALS (pre-configured):');
  console.log('   Email:    admin@dutchkem.com');
  console.log('   Password: Dutchkem@2024!');
  console.log('   MFA Code: 482913');
  console.log('   Role:     super_admin\n');
  console.log('⚠️  Change these credentials immediately in production!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check for environment variables first
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    try {
      // Get email
      while (!email || !isValidEmail(email)) {
        email = await question('📧 Enter admin email: ');
        if (!isValidEmail(email)) {
          console.log('   ❌ Invalid email format. Please try again.\n');
          email = null;
        }
      }

      // Get password
      while (!password || !isStrongPassword(password)) {
        password = await question('🔐 Enter admin password: ');
        if (!isStrongPassword(password)) {
          console.log('   ❌ Password must be at least 12 characters with:');
          console.log('      • 1 uppercase letter');
          console.log('      • 1 lowercase letter');
          console.log('      • 1 number');
          console.log('      • 1 special character (!@#$%^&*)\n');
          password = null;
        }
      }

      rl.close();
    } catch (err) {
      rl.close();
      throw err;
    }
  }

  // Hash password
  const passwordHash = hashPassword(password);
  
  // Generate MFA secret
  const mfaSecret = generateMFASecret();

  // Admin record (would be inserted into database)
  const adminRecord = {
    id: crypto.randomUUID(),
    email: email,
    password_hash: passwordHash,
    mfa_secret: mfaSecret,
    mfa_enabled: true,
    role: 'super_admin',
    created_at: new Date().toISOString(),
    last_login: null,
    failed_attempts: 0,
    locked_until: null,
  };

  console.log('\n✅ Admin user created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:', email);
  console.log('🆔 ID:', adminRecord.id);
  console.log('👤 Role:', adminRecord.role);
  console.log('🔐 MFA Secret:', mfaSecret);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔑 MFA SETUP INSTRUCTIONS:');
  console.log('   1. Open Google Authenticator or similar app');
  console.log('   2. Add a new account manually');
  console.log('   3. Enter the secret key above');
  console.log('   4. Use the 6-digit code to login\n');

  console.log('⚠️  SECURITY REMINDERS:');
  console.log('   • Store MFA secret securely (encrypted .env.admin file)');
  console.log('   • Never commit credentials to version control');
  console.log('   • Change password every 90 days');
  console.log('   • Session timeout is set to 15 minutes\n');

  console.log('🌐 Access the admin dashboard at:');
  console.log('   • /admin/dashboard');
  console.log('   • admin.dutchkem.com\n');

  // In production, this would insert into database:
  // await db.admins.create(adminRecord);
  
  console.log('💾 [DEMO MODE] Admin record (would be saved to database):');
  console.log(JSON.stringify(adminRecord, null, 2));
  console.log('\n');

  return adminRecord;
}

// Run script
createAdmin()
  .then(() => {
    console.log('🎉 Admin creation complete!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  });
