// ═══════════════════════════════════════════════════════════════════════
// DUTCHKEM VENTURES PROSUITE NG+ — CONFIGURATION
//
// ⚠️ SECURITY: In production, these values come from environment
// variables on the server. They are NEVER exposed to the browser.
//
// For this frontend-only demo, credentials are checked client-side.
// In a real deployment, ALL authentication happens on the backend
// via API calls to your Node.js/Express server.
// ═══════════════════════════════════════════════════════════════════════

// Detect environment: 'development' when running `npm run dev` locally
const isDev = (import.meta as any).env?.DEV ?? false;

export const config = {
  // Set to false for production deployment
  isDemoMode: isDev,

  // App info
  appName: 'Dutchkem Ventures ProSuite NG+',
  supportPhone: '+234 812 116 1202',
  supportEmail: 'support@dutchkem.com',

  // Payment — loaded from encrypted vault at runtime
  get payment() {
    const { PaymentVault } = require('./security/vault');
    return PaymentVault.displayCard;
  },

  // OTP config (in production, Termii sends real SMS)
  otp: {
    // In production, OTP is verified by backend + Termii API
    length: 6,
    expiryMinutes: 10,
    maxResends: 5,
  },

  // Session config
  session: {
    timeoutMinutes: 15,
    warningMinutes: 2,
  },

  // Brute force
  auth: {
    maxAttempts: 5,
    lockoutMinutes: 15,
  },
};
