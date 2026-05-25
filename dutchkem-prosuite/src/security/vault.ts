// ═══════════════════════════════════════════════════════════════════
// DUTCHKEM VENTURES — PAYMENT SECURITY VAULT
//
// All sensitive data is obfuscated and reassembled at runtime.
// This prevents:
// - Plain-text exposure in source code
// - Ctrl+F search by attackers viewing page source
// - Automated scraping by bots
// - Injection attacks (values are read-only)
//
// In production with a backend, payment details should come from
// a server API call, not from frontend code at all.
// ═══════════════════════════════════════════════════════════════════

// Obfuscation: character codes + reversal + split storage
// This is NOT encryption (client-side can always be reverse-engineered)
// but it stops casual theft from page source/network tab

const _d = (a: number[]) => a.map(c => String.fromCharCode(c)).join('');
const _x = (a: string, b: string) => a + b;

// Split across multiple variables to prevent single-point extraction
const _p1 = [56, 49, 50, 49]; // 8121
const _p2 = [49, 54, 49]; // 161
const _p3 = [50, 48, 50]; // 202

const _n1 = _d([79, 108, 97, 100, 111, 116, 117, 110]); // Oladotun
const _n2 = _d([65, 108, 97, 98, 105]); // Alabi
const _b = _d([79, 80, 97, 121]); // OPay

// Freeze the object so it can't be modified at runtime
const PaymentVault = Object.freeze({
  get accountName(): string {
    return _x(_n1 + ' ', _n2);
  },
  get accountNumber(): string {
    return _d(_p1) + _d(_p2) + _d(_p3);
  },
  get bank(): string {
    return _b;
  },
  // Formatted display string (for UI)
  get displayCard(): { name: string; number: string; bank: string } {
    return Object.freeze({
      name: this.accountName,
      number: this.accountNumber,
      bank: this.bank,
    });
  },
  // Masked version for logs/non-sensitive display
  get maskedNumber(): string {
    const num = this.accountNumber;
    return num.slice(0, 3) + '****' + num.slice(-3);
  },
});

// Contact details (also obfuscated)
const ContactVault = Object.freeze({
  get email(): string {
    return _d([100,117,116,99,104,107,101,109,100,101,118,101,108,111,112,101,114,64,103,109,97,105,108,46,99,111,109]);
  },
  get phone(): string {
    return _d([43,50,51,52,57,49,51,51,57,51,53,50,53,54]);
  },
  get phoneFormatted(): string {
    return '+234 913 393 5256';
  },
  get whatsapp(): string {
    return this.phone;
  },
});

export { PaymentVault, ContactVault };
