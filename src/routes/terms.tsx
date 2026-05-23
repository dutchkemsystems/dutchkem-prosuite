import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-4xl mx-auto px-4 py-24 md:py-32 space-y-16">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 uppercase leading-none">Terms of Service</h1>
          <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Version 2.4 — Effective May 2026</p>
        </div>

        <div className="space-y-12">
          <LegalSection title="1. Acceptance of Terms">
            <p>
              By accessing or using the Dutchkem Ventures Prosuite NG+ platform, you acknowledge that you have read, understood, and agree to be bound by these terms. 
              If you do not agree, you must immediately cease use of our services.
            </p>
          </LegalSection>

          <LegalSection title="2. Description of Services">
            <p>
              We provide access to 15 specialized expert agents for various professional tasks. 
              Outputs are provided on an "as-is" basis. Users are responsible for reviewing and validating all agent-generated content. 
              Each service includes 2 free revisions.
            </p>
          </LegalSection>

          <LegalSection title="3. User Accounts">
            <p>
              Users must be at least 18 years of age. You are responsible for maintaining the confidentiality of your account credentials. 
              Sharing account access with others is strictly prohibited and will result in immediate termination.
            </p>
          </LegalSection>

          <LegalSection title="4. Payments and Subscriptions">
            <p>
              All prices are listed in Nigerian Naira (₦). Subscriptions automatically renew at the end of each billing cycle unless cancelled through your dashboard. 
              A 14-day money-back guarantee applies to unused subscription periods.
            </p>
          </LegalSection>

          <LegalSection title="5. Refund Policy">
            <ul className="list-disc space-y-2">
              <li>Full refund: If a requested service is not delivered within 7 business days.</li>
              <li>Partial refund: Subject to dispute resolution for work deemed significantly unsatisfactory.</li>
              <li>No refund: For services already completed, delivered, and accepted.</li>
            </ul>
          </LegalSection>

          <LegalSection title="6. Limitation of Liability">
            <p>
              Dutchkem Ventures Prosuite NG+ is not liable for any financial or operational decisions made based on agent outputs. 
              Our total liability for any claim is limited to the amount paid for the specific service in question.
            </p>
          </LegalSection>

          <LegalSection title="7. Governing Law">
            <p>
              These terms are governed by the laws of the Federal Republic of Nigeria. 
              Any disputes shall be resolved through arbitration in Lagos, Nigeria.
            </p>
          </LegalSection>
          
          <div className="p-10 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Legal Contact</p>
             <p className="text-lg font-bold">legal@dutchkem.com</p>
          </div>
        </div>
      </main>
    </div>
  )
}

function LegalSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950 border-l-4 border-indigo-600 pl-6">{title}</h2>
      <div className="text-slate-600 leading-relaxed font-medium space-y-4 pl-10">
        {children}
      </div>
    </section>
  )
}
