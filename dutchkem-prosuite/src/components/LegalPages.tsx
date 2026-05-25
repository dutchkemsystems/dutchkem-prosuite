import { motion } from 'framer-motion';
import { PaymentVault, ContactVault } from '../security/vault';

interface LegalPagesProps {
  page: 'terms' | 'privacy' | 'refund';
}

export default function LegalPages({ page }: LegalPagesProps) {
  return (
    <section className="py-24 bg-cream min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {page === 'terms' && <TermsOfService />}
          {page === 'privacy' && <PrivacyPolicy />}
          {page === 'refund' && <RefundPolicy />}
        </motion.div>
      </div>
    </section>
  );
}

function TermsOfService() {
  return (
    <div className="prose-navy">
      <img src="/images/dutchkem-logo.png" alt="Dutchkem" className="w-16 h-16 object-contain mx-auto mb-4 rounded-lg" />
      <h1 className="font-display text-3xl font-bold text-navy text-center mb-2">Terms of Service</h1>
      <p className="text-center text-navy/40 text-sm mb-8">Last Updated: January 2025 • Dutchkem Ventures ProSuite NG+</p>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 space-y-6 text-sm text-navy/70 leading-relaxed">
        <Section title="1. Acceptance of Terms">
          By accessing or using Dutchkem Ventures ProSuite NG+ ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our services. These terms apply to all users — students, professionals, entrepreneurs, and businesses across Nigeria and worldwide.
        </Section>

        <Section title="2. Services Provided">
          Dutchkem Ventures operates 13 specialized AI agents providing: academic writing and research assistance, citation formatting, literature reviews, plagiarism detection, statistical analysis, presentation design, grant and scholarship matching, media production, data analysis, phone recovery, social media content creation, business consulting, and premium concierge services including visa processing, international relocation, and document attestation. All services are delivered digitally unless otherwise specified.
        </Section>

        <Section title="3. User Eligibility">
          You must be at least 16 years old to use our services. Users under 18 must have parental or guardian consent. You must provide a valid Nigerian phone number for OTP verification. By registering, you confirm that all information provided is accurate and truthful.
        </Section>

        <Section title="4. Payment Terms">
          All prices are listed in Nigerian Naira (₦) and are subject to change without prior notice. Payment is required before service delivery via bank transfer to our {PaymentVault.bank} account ({PaymentVault.accountName} — {PaymentVault.accountNumber}). Clients must upload proof of payment in the chat. Admin confirmation is required before service activation. Payments not confirmed within 48 hours are automatically expired.
        </Section>

        <Section title="5. Service Delivery">
          Delivery timelines vary by service and are provided at the time of order. Rush delivery is available at +50% of the standard price. All deliverables are provided in editable digital format (DOCX, PPTX, PDF, XLSX as applicable). Two (2) free revisions are included with every service. Additional revisions are charged at 20% of the original service price.
        </Section>

        <Section title="6. Academic Integrity">
          Our academic services are provided as reference, learning, and research assistance tools. Clients are responsible for ensuring their use complies with their institution's academic integrity policies. Dutchkem Ventures does not encourage or condone academic dishonesty. All academic work is original and plagiarism-free.
        </Section>

        <Section title="7. Intellectual Property">
          Upon full payment confirmation, clients receive full ownership of all deliverables. Dutchkem Ventures retains no rights to reproduce, distribute, or claim ownership of client-specific work. General templates, AI models, and platform technology remain the intellectual property of Dutchkem Ventures.
        </Section>

        <Section title="8. Privacy & Data Protection">
          We take your privacy seriously. All personal data is encrypted using AES-256 encryption. We do not sell, share, or lease your personal information to third parties. See our Privacy Policy for full details.
        </Section>

        <Section title="9. Limitation of Liability">
          Dutchkem Ventures provides services on an "as is" basis. While we strive for excellence, we do not guarantee specific academic grades, visa approvals, or business outcomes. Our liability is limited to the amount paid for the specific service in question. We are not liable for indirect, incidental, or consequential damages.
        </Section>

        <Section title="10. Account Termination">
          We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, submit fake payment receipts, or abuse our AI agents. Users may request account deletion at any time by contacting support.
        </Section>

        <Section title="11. Contact">
          For questions about these Terms, contact us at:
          {'\n'}📧 {ContactVault.email}
          {'\n'}📞 {ContactVault.phoneFormatted}
        </Section>
      </div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="prose-navy">
      <img src="/images/dutchkem-logo.png" alt="Dutchkem" className="w-16 h-16 object-contain mx-auto mb-4 rounded-lg" />
      <h1 className="font-display text-3xl font-bold text-navy text-center mb-2">Privacy Policy</h1>
      <p className="text-center text-navy/40 text-sm mb-8">Last Updated: January 2025 • Dutchkem Ventures ProSuite NG+</p>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 space-y-6 text-sm text-navy/70 leading-relaxed">
        <Section title="1. Information We Collect">
          We collect: phone numbers (for OTP verification and account identification), email addresses (optional, for notifications), chat messages (to provide AI agent services), uploaded files (documents, images, receipts for service delivery), payment references and receipts, device information and IP addresses (for security and fraud prevention). We do NOT collect passwords — authentication is OTP-based.
        </Section>

        <Section title="2. How We Use Your Data">
          Your data is used exclusively to: verify your identity via OTP, deliver the services you request, process and confirm your payments, improve our AI agents' response quality, send service status notifications (SMS, email, WhatsApp), prevent fraud and protect platform security, and comply with Nigerian data protection regulations (NDPR).
        </Section>

        <Section title="3. Data Security">
          We implement 18 layers of security including: AES-256 encryption for data at rest, TLS 1.3 for data in transit, bcrypt password hashing (cost factor 12) for admin accounts, MFA (Multi-Factor Authentication) for admin access, ClamAV virus scanning on all uploaded files, rate limiting (30 requests/minute), CSRF protection, XSS prevention, SQL injection prevention, and immutable audit logging for all actions.
        </Section>

        <Section title="4. Data Sharing">
          We NEVER sell your data. We share information only with: NVIDIA NIM (for AI processing — only your message content, anonymized), Termii (for SMS OTP delivery — only your phone number), our admin team (for payment verification and service delivery). All third-party services are bound by their own privacy policies and data protection agreements.
        </Section>

        <Section title="5. Data Retention">
          Chat history is retained for 90 days for continuity, then archived. Payment records are retained for 7 years (Nigerian financial regulation compliance). Uploaded documents are retained for 30 days after service completion, then permanently deleted. You may request immediate deletion of your data at any time.
        </Section>

        <Section title="6. Your Rights">
          Under the Nigeria Data Protection Regulation (NDPR), you have the right to: access your personal data, request correction of inaccurate data, request deletion of your data, withdraw consent at any time, lodge a complaint with NITDA (National Information Technology Development Agency).
        </Section>

        <Section title="7. Cookies & Local Storage">
          We use browser localStorage to remember your phone number, chat history, and preferences. No tracking cookies are used. No advertising pixels are deployed. You can clear all stored data by clearing your browser's local storage.
        </Section>

        <Section title="8. Contact Our Data Protection Officer">
          📧 {ContactVault.email}
          {'\n'}📞 {ContactVault.phoneFormatted}
          {'\n'}All data-related inquiries receive a response within 48 hours.
        </Section>
      </div>
    </div>
  );
}

function RefundPolicy() {
  return (
    <div className="prose-navy">
      <img src="/images/dutchkem-logo.png" alt="Dutchkem" className="w-16 h-16 object-contain mx-auto mb-4 rounded-lg" />
      <h1 className="font-display text-3xl font-bold text-navy text-center mb-2">Refund Policy</h1>
      <p className="text-center text-navy/40 text-sm mb-8">Last Updated: January 2025 • Dutchkem Ventures ProSuite NG+</p>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 space-y-6 text-sm text-navy/70 leading-relaxed">
        <div className="bg-forest/5 border border-forest/10 rounded-xl p-4 text-center">
          <p className="font-bold text-forest text-base">Our Promise: Your Satisfaction or Your Money Back</p>
          <p className="text-forest/70 text-sm mt-1">We believe in our work so strongly that we offer clear, fair refund terms.</p>
        </div>

        <Section title="1. Full Refund (100%)">
          You are entitled to a full refund if: we fail to deliver the service within the agreed timeline AND you request cancellation before delivery, the deliverable is fundamentally different from what was agreed upon and cannot be corrected through revisions, a technical error on our part prevents service delivery, duplicate payment was made (we'll refund the extra amount within 24 hours), or your visa application is denied due to a documented error made by our ServiceMart team.
        </Section>

        <Section title="2. Partial Refund (50%)">
          A partial refund may be issued if: you cancel a service after work has begun but before final delivery, the deliverable requires more than 2 major revisions due to unclear initial instructions (we'll split responsibility with you), or service was delivered late but the work quality meets the agreed standard.
        </Section>

        <Section title="3. No Refund">
          Refunds are NOT available if: the service has been fully delivered and downloaded, your 2 free revisions have been used and the work matches the original brief, dissatisfaction is based on a subjective preference (e.g., "I don't like the writing style") after the agreed scope was met, a visa is denied for reasons outside our control (criminal record, insufficient funds, incomplete client documents), you provided incorrect or misleading information that affected the deliverable, or more than 14 days have passed since delivery.
        </Section>

        <Section title="4. How to Request a Refund">
          1️⃣ Contact us within 14 days of delivery via WhatsApp ({ContactVault.phoneFormatted}) or email ({ContactVault.email})
          {'\n'}2️⃣ Provide your payment reference number and a clear explanation
          {'\n'}3️⃣ Our team reviews within 48 hours
          {'\n'}4️⃣ Approved refunds are processed within 3-5 business days to your original payment method
        </Section>

        <Section title="5. Revision vs. Refund">
          Before requesting a refund, we strongly encourage using your 2 free revisions. In most cases, revisions resolve the issue faster than a refund process. Our goal is to deliver work you're proud of — not to keep your money for unfinished work. If after 2 revisions you're still unsatisfied, we escalate to our senior team for a resolution.
        </Section>

        <Section title="6. Bundle Refunds">
          For bundle packages (Starter, Professional, Complete): individual services within a bundle can be refunded based on the standalone price, not the discounted bundle price. If you cancel the entire bundle before any service is delivered, you receive a full refund.
        </Section>

        <Section title="7. Disputes">
          If you disagree with a refund decision, you may escalate by emailing {ContactVault.email} with the subject line "REFUND DISPUTE — [your reference number]". Disputes are reviewed by senior management within 5 business days. Our decision on escalated disputes is final.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display font-bold text-navy text-base mb-2">{title}</h3>
      <p className="whitespace-pre-line">{children}</p>
    </div>
  );
}
