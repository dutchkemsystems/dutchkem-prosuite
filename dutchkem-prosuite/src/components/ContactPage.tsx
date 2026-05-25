import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Phone, Mail, MapPin, MessageCircle, Clock, CheckCircle, Globe, Shield } from 'lucide-react';
import { ContactVault } from '../security/vault';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="py-24 bg-cream min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <img src="/images/dutchkem-logo.png" alt="Dutchkem Ventures" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-lg rounded-xl" />
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy">
            We're One Message Away <span className="text-coral">From Solving Your Problem</span>
          </h2>
          <p className="mt-4 text-navy/60 text-lg max-w-2xl mx-auto">
            Don't struggle alone. Whether it's a question, a complaint, or a "how do I even start?" — reach out. 
            Our team responds within 2 hours, and our AI agents are available 24/7.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="space-y-4">
              {[
                { icon: <Phone size={22} />, title: 'Phone / WhatsApp', detail: ContactVault.phoneFormatted, sub: 'Call or WhatsApp us anytime. We pick up.', color: 'bg-forest/10 text-forest' },
                { icon: <Mail size={22} />, title: 'Email', detail: ContactVault.email, sub: 'Expect a reply within 2 hours. We don\'t ghost.', color: 'bg-electric/10 text-electric' },
                { icon: <MapPin size={22} />, title: 'Location', detail: 'All of Nigeria', sub: 'All 36 states + FCT — 100% remote services', color: 'bg-coral/10 text-coral' },
                { icon: <MessageCircle size={22} />, title: 'Live AI Chat', detail: 'Available 24/7', sub: '13 AI agents ready right now — no waiting, no queue', color: 'bg-gold/10 text-gold-dark' },
                { icon: <Clock size={22} />, title: 'Support Hours', detail: 'Monday — Sunday', sub: 'AI: 24/7 • Human support: 8AM — 10PM WAT', color: 'bg-purple-100 text-purple-600' },
                { icon: <Globe size={22} />, title: 'International Clients', detail: 'We serve globally', sub: 'Nigerians abroad? We handle your visa, WES & documents from here', color: 'bg-teal-100 text-teal-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>{item.icon}</div>
                  <div>
                    <h3 className="font-bold text-navy">{item.title}</h3>
                    <p className="text-navy/70 font-medium">{item.detail}</p>
                    <p className="text-sm text-navy/40 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Info */}
            <div className="mt-6 bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-6 text-white">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Shield size={16} className="text-gold" /> Secure Payments</h3>
              <div className="bg-white/10 rounded-xl p-4 text-sm space-y-2">
                <p className="text-white/80">💳 All payments processed securely via <span className="text-gold font-bold">Kora Pay</span></p>
                <p className="text-white/60 text-xs mt-2">Accepted: Debit/Credit Cards • Bank Transfer • USSD • Mobile Money</p>
                <p className="text-white/60 text-xs">✅ Instant confirmation • 🔒 Bank-grade encryption • 📱 SMS receipt</p>
                <p className="text-white/40 text-xs mt-2">Payments auto-confirm. No manual verification needed.</p>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            {submitted ? (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-forest/10 flex items-center justify-center mb-6"><CheckCircle size={40} className="text-forest" /></div>
                <h3 className="font-display text-2xl font-bold text-navy mb-3">Message Sent! ✅</h3>
                <p className="text-navy/60 max-w-md">Thank you for reaching out. Our team will get back to you within 2 hours. You'll receive a confirmation on WhatsApp or email.</p>
                <button onClick={() => setSubmitted(false)} className="mt-6 px-6 py-3 bg-navy text-white rounded-xl font-semibold hover:bg-navy-light transition-colors cursor-pointer">Send Another Message</button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-gray-100">
                <h3 className="font-display text-xl font-bold text-navy mb-2">Send Us a Message</h3>
                <p className="text-sm text-navy/40 mb-6">Tell us what you need. No form is too short, no question is too small.</p>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-navy/70 block mb-1.5">Full Name *</label>
                      <input type="text" placeholder="Your full name" className="w-full px-4 py-3 bg-cream rounded-xl text-navy border border-gray-100 focus:border-coral focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy/70 block mb-1.5">Phone Number *</label>
                      <input type="tel" placeholder="+234 913 393 5256" className="w-full px-4 py-3 bg-cream rounded-xl text-navy border border-gray-100 focus:border-coral focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-navy/70 block mb-1.5">Email *</label>
                    <input type="email" placeholder="your@email.com" className="w-full px-4 py-3 bg-cream rounded-xl text-navy border border-gray-100 focus:border-coral focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-navy/70 block mb-1.5">Which service interests you?</label>
                    <select className="w-full px-4 py-3 bg-cream rounded-xl text-navy border border-gray-100 focus:border-coral focus:outline-none cursor-pointer">
                      <option value="">Select a service</option>
                      <option>🎓 Academic Pro — Thesis, Essays, Assignments</option>
                      <option>📝 FormatPro — Citations & Formatting</option>
                      <option>📚 LitReview Pro — Literature Reviews</option>
                      <option>🔍 Plagiarism Pro — Plagiarism Check & Exams</option>
                      <option>📊 StatsPro — Statistical Analysis</option>
                      <option>🎨 Presentation Pro — PowerPoint & Posters</option>
                      <option>🏆 Grant Pro — Grants & Scholarships</option>
                      <option>🎬 MediaStudio Pro — Video, Audio, Animation</option>
                      <option>💾 DataPro — Data Analysis & Dashboards</option>
                      <option>📱 PhoneRetriever — Stolen Phone Recovery</option>
                      <option>📣 ContentPro — Social Media Growth</option>
                      <option>💼 BusinessPro — Business Plans & Legal</option>
                      <option>🌍 ServiceMart NG — Visa, Relocation, Apostille</option>
                      <option>Other / I'm not sure yet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-navy/70 block mb-1.5">Your Message *</label>
                    <textarea rows={4} placeholder="Describe what you need. The more detail, the faster we help..." className="w-full px-4 py-3 bg-cream rounded-xl text-navy border border-gray-100 focus:border-coral focus:outline-none resize-none" />
                  </div>
                  <button onClick={() => setSubmitted(true)} className="w-full py-4 bg-gradient-to-r from-coral to-coral-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-coral/30 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Send size={18} /> Send Message
                  </button>
                  <p className="text-center text-xs text-navy/30">By submitting, you agree to our Terms of Service and Privacy Policy.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
