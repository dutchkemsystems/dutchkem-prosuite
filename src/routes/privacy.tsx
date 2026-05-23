import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-4xl mx-auto px-4 py-24 md:py-32 space-y-16">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 uppercase leading-none">Privacy Policy</h1>
          <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Last Updated: May 15, 2026</p>
        </div>

        <div className="space-y-12">
          <LegalSection title="1. Information We Collect">
            <ul className="list-disc pl-6 space-y-2">
              <li>Personal identifiers (name, email address, phone number).</li>
              <li>Payment information: All payments are securely processed by Kora Pay. We do not store full credit card details on our servers.</li>
              <li>Usage data: We collect logs of agent interactions and project history to deliver services.</li>
            </ul>
          </LegalSection>

          <LegalSection title="2. How We Use Your Information">
            <p>We use the data we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Execute and deliver the expert agent services you request.</li>
              <li>Process transactions and manage your subscription lifecycle.</li>
              <li>Improve agent performance through anonymized and aggregated interaction data.</li>
              <li>Communicate platform updates (you may opt-out at any time).</li>
            </ul>
          </LegalSection>

          <LegalSection title="3. Data Security">
            <p>
              We implement bank-grade security protocols, including AES-256 encryption for all data at rest and TLS 1.3 for data in transit. 
              We never share your personal information with third parties for marketing purposes without your explicit consent.
            </p>
          </LegalSection>

          <LegalSection title="4. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access, rectify, or request the deletion of your personal data.</li>
              <li>Export your data in a portable format (JSON/CSV).</li>
              <li>Withdraw your consent for data processing at any time through account settings.</li>
            </ul>
          </LegalSection>

          <LegalSection title="5. Cookies">
            <p>
              We use essential cookies for session management and authentication. 
              Optional analytics cookies help us understand platform usage; these can be disabled in your browser settings.
            </p>
          </LegalSection>

          <LegalSection title="6. Contact Information">
            <div className="p-8 bg-white rounded-3xl border border-slate-100">
               <p className="font-black text-slate-950 uppercase tracking-widest mb-2">Data Protection Officer</p>
               <p className="text-slate-500 font-bold">Email: dpo@dutchkem.com</p>
               <p className="text-slate-500 font-bold">Address: 26, Opeki Road, Ipaja, Ayobo, Lagos</p>
            </div>
          </LegalSection>
        </div>
      </main>
    </div>
  )
}

function LegalSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950 border-l-4 border-orange-500 pl-6">{title}</h2>
      <div className="text-slate-600 leading-relaxed font-medium space-y-4 pl-10">
        {children}
      </div>
    </section>
  )
}
