const REQUIRED_ENV_VARS = [
  'JWT_SECRET_CLIENT',
  'JWT_SECRET_ADMIN',
  'REFRESH_SECRET',
  'VITE_CONVEX_URL',
  'NVIDIA_NIM_API_KEY',
  'TERMII_API_KEY',
];

const PRODUCTION_ONLY_VARS = [
  'KORA_SECRET_KEY',
  'KORA_ENCRYPTION_KEY',
];

function validateEnv() {
  const missing = [];
  const warnings = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    for (const key of PRODUCTION_ONLY_VARS) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  if (process.env.JWT_SECRET_CLIENT && process.env.JWT_SECRET_CLIENT.length < 32) {
    warnings.push('JWT_SECRET_CLIENT must be at least 32 characters');
  }
  if (process.env.JWT_SECRET_ADMIN && process.env.JWT_SECRET_ADMIN.length < 32) {
    warnings.push('JWT_SECRET_ADMIN must be at least 32 characters');
  }
  if (process.env.REFRESH_SECRET && process.env.REFRESH_SECRET.length < 32) {
    warnings.push('REFRESH_SECRET must be at least 32 characters');
  }

  if (missing.length > 0) {
    console.error(' Missing required environment variables:');
    for (const key of missing) {
      console.error(`   - ${key}`);
    }
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(` WARN: ${w}`);
    }
  }

  return {
    jwt: {
      client: process.env.JWT_SECRET_CLIENT,
      admin: process.env.JWT_SECRET_ADMIN,
      refresh: process.env.REFRESH_SECRET,
    },
    nvidia: process.env.NVIDIA_NIM_API_KEY,
    termii: {
      key: process.env.TERMII_API_KEY,
      sender: process.env.TERMII_SENDER_ID || 'Dutchkem',
    },
    kora: {
      public: process.env.KORA_PUBLIC_KEY,
      secret: process.env.KORA_SECRET_KEY,
      encryption: process.env.KORA_ENCRYPTION_KEY,
      webhook: process.env.KORA_PAY_WEBHOOK_SECRET,
    },
    postiz: {
      clientId: process.env.POSTIZ_CLIENT_ID,
      clientSecret: process.env.POSTIZ_CLIENT_SECRET,
      apiBase: process.env.POSTIZ_API_BASE || 'https://api.postiz.com/v1',
      webhookSecret: process.env.POSTIZ_WEBHOOK_SECRET,
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

export { validateEnv, REQUIRED_ENV_VARS };
