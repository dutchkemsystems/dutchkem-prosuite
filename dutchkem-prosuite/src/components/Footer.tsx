import { Shield, Heart } from 'lucide-react';

interface FooterProps {
  setCurrentPage: (page: string) => void;
}

export default function Footer({ setCurrentPage }: FooterProps) {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/dutchkem-logo.png"
                alt="Dutchkem Ventures"
                className="w-12 h-12 object-contain rounded-lg drop-shadow-lg"
              />
              <div>
                <p className="font-display font-bold text-sm">Dutchkem Ventures</p>
                <p className="text-xs text-white/40">ProSuite NG+</p>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Your academic success, business growth, and professional services handled with care.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Shield size={14} className="text-forest-light" />
              <span className="text-xs text-white/40">18-Layer Security • Bank-Grade Encryption</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-white/70 mb-4">Services</h4>
            <ul className="space-y-2">
              {['Academic Pro', 'FormatPro', 'MediaStudio Pro', 'DataPro', 'PhoneRetriever', 'ContentPro', 'BusinessPro', 'ServiceMart NG'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => setCurrentPage('services')}
                    className="text-sm text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-white/70 mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                { label: 'About Us', page: 'about' },
                { label: 'Pricing', page: 'pricing' },
                { label: 'Contact', page: 'contact' },
                { label: 'Terms of Service', page: 'terms' },
                { label: 'Privacy Policy', page: 'privacy' },
                { label: 'Refund Policy', page: 'refund' },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => setCurrentPage(item.page)}
                    className="text-sm text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Payment */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-white/70 mb-4">Secure Payments</h4>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-gold font-bold text-sm mb-2">💳 Powered by Kora Pay</p>
              <p className="text-white/50 text-xs">✅ Debit/Credit Cards</p>
              <p className="text-white/50 text-xs">✅ Bank Transfer</p>
              <p className="text-white/50 text-xs">✅ USSD</p>
              <p className="text-white/50 text-xs">✅ Mobile Money</p>
              <p className="text-white/40 text-xs mt-3">Instant auto-confirmation</p>
              <p className="text-white/40 text-xs">Bank-grade encryption</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30 flex items-center gap-1">
            © {new Date().getFullYear()} Dutchkem Ventures ProSuite NG+. All rights reserved. Made with <Heart size={12} className="text-coral" /> for Nigeria
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <span>🇳🇬 Serving all 36 states + FCT — Nationwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
