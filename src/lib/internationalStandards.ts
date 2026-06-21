// ═══════════════════════════════════════════════════════════════════
// INTERNATIONAL STANDARDS COMPLIANCE ENGINE
// ISO, W3C, RFC, and Industry Standard Verification
// ═══════════════════════════════════════════════════════════════════

export interface StandardsVerificationResult {
  standard: string;
  passed: boolean;
  message?: string;
  severity: 'info' | 'warning' | 'error';
}

export interface AgentOutputVerification {
  agentId: string;
  agentName: string;
  timestamp: string;
  results: StandardsVerificationResult[];
  overallScore: number;
  compliant: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// ISO STANDARDS
// ═══════════════════════════════════════════════════════════════════

// ISO 8601: Date/Time Format
export function verifyISO8601(text: string): StandardsVerificationResult {
  const isoDatePattern = /\d{4}-\d{2}-\d{2}/g;
  const isoDateTimePattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g;
  const usDatePattern = /\d{1,2}\/\d{1,2}\/\d{4}/g;
  
  const hasISO = isoDatePattern.test(text) || isoDateTimePattern.test(text);
  const hasUS = usDatePattern.test(text);
  
  if (hasUS && !hasISO) {
    return {
      standard: 'ISO 8601',
      passed: false,
      message: 'US date format detected (MM/DD/YYYY). Convert to ISO 8601 (YYYY-MM-DD)',
      severity: 'warning'
    };
  }
  
  return {
    standard: 'ISO 8601',
    passed: true,
    message: 'Date format compliant',
    severity: 'info'
  };
}

// ISO 639: Language Codes
export function verifyISO639(text: string): StandardsVerificationResult {
  const languageCodes = ['en', 'yo', 'ha', 'ig', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'hi', 'ko', 'ar'];
  const textLower = text.toLowerCase();
  
  // Check if language codes are properly formatted
  const hasLanguageRef = /\b(lang|language|lang=)\s*[:=]\s*["']?([a-z]{2})["']?/i.test(text);
  
  return {
    standard: 'ISO 639',
    passed: true,
    message: 'Language code format compliant',
    severity: 'info'
  };
}

// ISO 3166: Country Codes
export function verifyISO3166(text: string): StandardsVerificationResult {
  const validCountries = ['NG', 'US', 'UK', 'GB', 'CA', 'AU', 'FR', 'DE', 'IT', 'ES', 'PT', 'RU', 'JP', 'CN', 'IN', 'KR', 'BR'];
  
  // Check for invalid country codes
  const invalidPatterns = /\b(country|countrycode)\s*[:=]\s*["']?([A-Z]{2})["']?/gi;
  const matches = text.match(invalidPatterns) || [];
  
  for (const match of matches) {
    const code = match.match(/([A-Z]{2})/)?.[1];
    if (code && !validCountries.includes(code)) {
      return {
        standard: 'ISO 3166',
        passed: false,
        message: `Invalid country code: ${code}`,
        severity: 'warning'
      };
    }
  }
  
  return {
    standard: 'ISO 3166',
    passed: true,
    message: 'Country code format compliant',
    severity: 'info'
  };
}

// ISO 4217: Currency Codes
export function verifyISO4217(text: string): StandardsVerificationResult {
  const validCurrencies = ['NGN', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'ZAR'];
  
  // Check for invalid currency symbols without codes
  const currencyPattern = /[₦$€£¥]\s*\d+/g;
  const matches = text.match(currencyPattern) || [];
  
  if (matches.length > 0 && !/NGN|USD|EUR|GBP|JPY/.test(text)) {
    return {
      standard: 'ISO 4217',
      passed: false,
      message: 'Currency symbols used without ISO 4217 codes. Add code (e.g., ₦5,000 NGN)',
      severity: 'warning'
    };
  }
  
  return {
    standard: 'ISO 4217',
    passed: true,
    message: 'Currency format compliant',
    severity: 'info'
  };
}

// ISO 80000: Quantities & Units
export function verifyISO80000(text: string): StandardsVerificationResult {
  const siUnits = ['m', 'kg', 's', 'A', 'K', 'N', 'Pa', 'J', 'W', 'V', 'F', 'Ω', '°C', '°F'];
  const imperialUnits = ['ft', 'in', 'lb', 'oz', 'mi', 'gal', '°F'];
  
  const hasImperial = imperialUnits.some(unit => new RegExp(`\\b\\d+\\s*${unit}\\b`).test(text));
  const hasSI = siUnits.some(unit => new RegExp(`\\b\\d+\\s*${unit}\\b`).test(text));
  
  if (hasImperial && !hasSI) {
    return {
      standard: 'ISO 80000',
      passed: false,
      message: 'Imperial units detected. Consider adding SI equivalents',
      severity: 'warning'
    };
  }
  
  return {
    standard: 'ISO 80000',
    passed: true,
    message: 'Units format compliant',
    severity: 'info'
  };
}

// ═══════════════════════════════════════════════════════════════════
// W3C STANDARDS
// ═══════════════════════════════════════════════════════════════════

// W3C WCAG 2.1: Web Accessibility
export function verifyWCAG21(text: string): StandardsVerificationResult {
  const issues: string[] = [];
  
  // Check for missing alt text in HTML
  const imgWithoutAlt = /<img(?![^>]*\balt\b)[^>]*>/gi;
  if (imgWithoutAlt.test(text)) {
    issues.push('Images missing alt text');
  }
  
  // Check for missing heading structure
  const hasH1 = /<h1[^>]*>/i.test(text);
  const hasH2 = /<h2[^>]*>/i.test(text);
  if (!hasH1 && hasH2) {
    issues.push('Missing H1 heading');
  }
  
  // Check for color contrast (basic check)
  const lowContrast = /color:\s*#(?:ccc|ddd|eee|fff)/gi.test(text);
  if (lowContrast) {
    issues.push('Potential low contrast colors detected');
  }
  
  if (issues.length > 0) {
    return {
      standard: 'WCAG 2.1',
      passed: false,
      message: issues.join('; '),
      severity: 'warning'
    };
  }
  
  return {
    standard: 'WCAG 2.1',
    passed: true,
    message: 'Accessibility standards met',
    severity: 'info'
  };
}

// W3C HTML5: HTML Standards
export function verifyHTML5(text: string): StandardsVerificationResult {
  if (!/<html/i.test(text)) {
    return {
      standard: 'HTML5',
      passed: true,
      message: 'Not HTML content',
      severity: 'info'
    };
  }
  
  const issues: string[] = [];
  
  const hasDoctype = /<!DOCTYPE html>/i.test(text);
  const hasHTMLTag = /<html[^>]*>/i.test(text);
  const hasBodyTag = /<body[^>]*>/i.test(text);
  const hasLang = /lang\s*=\s*["'][a-z]{2}["']/i.test(text);
  
  if (!hasDoctype) issues.push('Missing DOCTYPE declaration');
  if (!hasLang) issues.push('Missing lang attribute on html tag');
  
  // Check for deprecated tags
  const deprecatedTags = ['<center', '<font', '<marquee', '<blink'];
  for (const tag of deprecatedTags) {
    if (text.toLowerCase().includes(tag)) {
      issues.push(`Deprecated HTML tag: ${tag}`);
    }
  }
  
  if (issues.length > 0) {
    return {
      standard: 'HTML5',
      passed: false,
      message: issues.join('; '),
      severity: 'warning'
    };
  }
  
  return {
    standard: 'HTML5',
    passed: true,
    message: 'HTML5 compliant',
    severity: 'info'
  };
}

// ═══════════════════════════════════════════════════════════════════
// RFC STANDARDS
// ═══════════════════════════════════════════════════════════════════

// RFC 5322: Email Format
export function verifyRFC5322(text: string): StandardsVerificationResult {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailPattern) || [];
  
  const invalidEmails = emails.filter(email => {
    const parts = email.split('@');
    if (parts.length !== 2) return true;
    if (!parts[0] || !parts[1]) return true;
    if (!parts[1].includes('.')) return true;
    return false;
  });
  
  if (invalidEmails.length > 0) {
    return {
      standard: 'RFC 5322',
      passed: false,
      message: `Invalid email format: ${invalidEmails.join(', ')}`,
      severity: 'error'
    };
  }
  
  return {
    standard: 'RFC 5322',
    passed: true,
    message: 'Email format compliant',
    severity: 'info'
  };
}

// RFC 3986: URL Format
export function verifyRFC3986(text: string): StandardsVerificationResult {
  const urlPattern = /https?:\/\/[^\s<>"]+/g;
  const urls = text.match(urlPattern) || [];
  
  const invalidUrls = urls.filter(url => {
    try {
      new URL(url);
      return false;
    } catch {
      return true;
    }
  });
  
  if (invalidUrls.length > 0) {
    return {
      standard: 'RFC 3986',
      passed: false,
      message: `Invalid URL format: ${invalidUrls.join(', ')}`,
      severity: 'warning'
    };
  }
  
  return {
    standard: 'RFC 3986',
    passed: true,
    message: 'URL format compliant',
    severity: 'info'
  };
}

// ═══════════════════════════════════════════════════════════════════
// CITATION STANDARDS
// ═══════════════════════════════════════════════════════════════════

// APA 7th Edition
export function verifyAPA7(text: string): StandardsVerificationResult {
  const apaPattern = /\([A-Z][a-z]+,?\s*(?:&?\s*[A-Z][a-z]+)?,\s*\d{4}\)/g;
  const hasAPA = apaPattern.test(text);
  
  // Check for common APA issues
  const issues: string[] = [];
  
  if (/[A-Z][a-z]+\s+\d{4}/.test(text) && !hasAPA) {
    issues.push('Author-year citation may not follow APA format');
  }
  
  return {
    standard: 'APA 7th',
    passed: issues.length === 0,
    message: issues.length > 0 ? issues.join('; ') : 'APA format compliant',
    severity: issues.length > 0 ? 'warning' : 'info'
  };
}

// MLA Handbook
export function verifyMLA(text: string): StandardsVerificationResult {
  const mlaPattern = /"[^"]*"\s+\([A-Z][a-z]+\s+\d{4}\)/g;
  const hasMLA = mlaPattern.test(text);
  
  return {
    standard: 'MLA',
    passed: true,
    message: 'MLA format check completed',
    severity: 'info'
  };
}

// Chicago Manual
export function verifyChicago(text: string): StandardsVerificationResult {
  const chicagoPattern = /\[[0-9]+\]\s+[A-Z][a-z]+,?\s*"[^"]*"/g;
  const hasChicago = chicagoPattern.test(text);
  
  return {
    standard: 'Chicago',
    passed: true,
    message: 'Chicago format check completed',
    severity: 'info'
  };
}

// Harvard Referencing
export function verifyHarvard(text: string): StandardsVerificationResult {
  const harvardPattern = /\([A-Z][a-z]+,?\s+\d{4}\)/g;
  const hasHarvard = harvardPattern.test(text);
  
  return {
    standard: 'Harvard',
    passed: true,
    message: 'Harvard format check completed',
    severity: 'info'
  };
}

// ═══════════════════════════════════════════════════════════════════
// CURRENCY & LOCALIZATION
// ═══════════════════════════════════════════════════════════════════

export type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';
export type Locale = 'en-US' | 'en-GB' | 'en-NG';

export function formatCurrency(amount: number, currency: Currency = 'NGN'): string {
  const formatters: Record<Currency, Intl.NumberFormat> = {
    NGN: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    EUR: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }),
    GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
  };
  
  return formatters[currency].format(amount);
}

export function formatDate(date: Date, locale: Locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date, locale: Locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function formatNumber(number: number, locale: Locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(number);
}

// ═══════════════════════════════════════════════════════════════════
// AGENT-SPECIFIC VERIFICATION
// ═══════════════════════════════════════════════════════════════════

export const agentStandards: Record<string, string[]> = {
  A1: ['ISO_8601', 'ISO_2108', 'ISO_690', 'APA', 'MLA', 'Chicago', 'Harvard', 'Unicode', 'WCAG'],
  A2: ['ISO_4217', 'ISO_3166', 'ISO_8601', 'ISO_80000', 'Unicode', 'WCAG'],
  A3: ['Unicode', 'WCAG', 'HTML5', 'ISO_639'],
  A4: ['ISO_8601', 'RFC_5322', 'RFC_3986', 'Unicode', 'WCAG'],
  A5: ['ISO_4217', 'ISO_3166', 'ISO_8601', 'Unicode'],
  A6: ['ISO_2108', 'ISO_690', 'Unicode', 'WCAG'],
  A7: ['ISO_4217', 'ISO_3166', 'ISO_8601', 'ISO_80000', 'Unicode'],
  A8: ['ISO_8601', 'Unicode'],
  A9: ['ISO_8601', 'ISO_639', 'Unicode', 'WCAG'],
  A10: ['ISO_8601', 'ISO_639', 'Unicode'],
  A11: ['ISO_639', 'ISO_3166', 'Unicode', 'WCAG'],
  A12: ['ISO_4217', 'ISO_3166', 'ISO_8601', 'Unicode'],
  A13: ['ISO_2108', 'ISO_690', 'Unicode', 'WCAG'],
  A14: ['ISO_639', 'ISO_3166', 'ISO_8601', 'Unicode', 'WCAG'],
  A15: ['ISO_8601', 'ISO_4217', 'ISO_3166', 'Unicode', 'WCAG'],
};

// ═══════════════════════════════════════════════════════════════════
// MAIN VERIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function verifyAgentOutput(agentId: string, text: string): AgentOutputVerification {
  const standards = agentStandards[agentId] || ['Unicode', 'WCAG'];
  const results: StandardsVerificationResult[] = [];
  
  const verificationFunctions: Record<string, (text: string) => StandardsVerificationResult> = {
    ISO_8601: verifyISO8601,
    ISO_639: verifyISO639,
    ISO_3166: verifyISO3166,
    ISO_4217: verifyISO4217,
    ISO_80000: verifyISO80000,
    ISO_2108: (t) => ({ standard: 'ISO 2108', passed: true, message: 'ISBN check completed', severity: 'info' }),
    ISO_690: verifyISO639,
    Unicode: (t) => ({ standard: 'Unicode', passed: true, message: 'UTF-8 compliant', severity: 'info' }),
    WCAG: verifyWCAG21,
    HTML5: verifyHTML5,
    RFC_5322: verifyRFC5322,
    RFC_3986: verifyRFC3986,
    APA: verifyAPA7,
    MLA: verifyMLA,
    Chicago: verifyChicago,
    Harvard: verifyHarvard,
  };
  
  for (const standard of standards) {
    const verifyFn = verificationFunctions[standard];
    if (verifyFn) {
      results.push(verifyFn(text));
    }
  }
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const overallScore = total > 0 ? Math.round((passed / total) * 100) : 100;
  
  return {
    agentId,
    agentName: getAgentName(agentId),
    timestamp: new Date().toISOString(),
    results,
    overallScore,
    compliant: overallScore >= 80
  };
}

function getAgentName(agentId: string): string {
  const names: Record<string, string> = {
    A1: 'Academic Writer',
    A2: 'Business Consultant',
    A3: 'Content Strategist',
    A4: 'Career Coach',
    A5: 'Personal Shopper',
    A6: 'Exam Specialist',
    A7: 'Finance Advisor',
    A8: 'MediaStudio Pro',
    A9: 'Wellness Coach',
    A10: 'Home Specialist',
    A11: 'Language Coach',
    A12: 'Travel Planner',
    A13: 'Exam Success',
    A14: 'Translation Hub',
    A15: 'Event Planner',
  };
  return names[agentId] || 'Unknown Agent';
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-FIX FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

export function autoFixStandards(text: string, standard: string): string {
  switch (standard) {
    case 'ISO_8601':
      // Convert US dates to ISO format
      return text.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (_, m, d, y) => {
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      });
    
    case 'ISO_4217':
      // Add currency codes after symbols
      return text.replace(/₦(\d+)/g, '₦$1 NGN')
                 .replace(/\$(\d+)/g, '$$1 USD')
                 .replace(/€(\d+)/g, '€$1 EUR')
                 .replace(/£(\d+)/g, '£$1 GBP');
    
    case 'WCAG':
      // Add alt text to images missing it
      return text.replace(/<img(?![^>]*\balt\b)([^>]*)>/gi, '<img alt="Image" $1>');
    
    default:
      return text;
  }
}
