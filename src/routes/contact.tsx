import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-7xl mx-auto px-4 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
          <div className="space-y-12">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 uppercase leading-none">Get in Touch</h1>
              <p className="text-lg text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                Connect with our expert agents for professional support across Nigeria.
              </p>
            </div>

            <div className="space-y-10">
              <ContactInfoItem 
                title="Head Office" 
                content="26, Opeki Road, Ipaja, Ayobo, Lagos State, Nigeria" 
                icon="📍"
              />
              <ContactInfoItem 
                title="Phone & WhatsApp" 
                content="(+234)-911-339-3525" 
                icon="📞"
              />
              <ContactInfoItem 
                title="Email Support" 
                content={
                  <div className="space-y-1">
                    <p>hello@dutchkem.com</p>
                    <p>support@dutchkem.com</p>
                    <p>careers@dutchkem.com</p>
                  </div>
                } 
                icon="✉️"
              />
              <ContactInfoItem 
                title="Business Hours" 
                content={
                  <div className="space-y-1">
                    <p>Mon - Fri: 9:00 AM - 6:00 PM WAT</p>
                    <p>Sat: 10:00 AM - 2:00 PM WAT</p>
                    <p>Sun: Closed (Email support active)</p>
                  </div>
                } 
                icon="⏰"
              />
            </div>

            {/* Map Placeholder */}
            <div className="aspect-video w-full bg-slate-200 rounded-[2.5rem] overflow-hidden shadow-inner grayscale relative">
               <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-black uppercase tracking-widest text-xs">
                  Google Maps Embed: 26 Opeki Road, Ipaja, Ayobo, Lagos
               </div>
               <iframe 
                 src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.2676016147426!2d3.25055!3d6.61366!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMzYnNDkuMiJOIDPCsDE1JzAyLjAiRQ!5e0!3m2!1sen!2sng!4v1715760000000!5m2!1sen!2sng" 
                 width="100%" 
                 height="100%" 
                 style={{ border: 0 }} 
                 allowFullScreen 
                 loading="lazy"
                 className="opacity-50"
               ></iframe>
            </div>
          </div>

          <div className="relative">
            <div className="sticky top-32 bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl border border-slate-100">
              {submitted ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto">✓</div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Message Received</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">One of our agents will contact you within 2 business hours.</p>
                  <button onClick={() => setSubmitted(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">Send Another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Send a Message</h2>
                    <div className="w-12 h-1 bg-orange-500 rounded-full"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField label="Full Name" placeholder="John Doe" required />
                    <InputField label="Email Address" placeholder="john@example.com" type="email" required />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputField label="Phone Number" placeholder="+234 ..." />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Subject</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-bold appearance-none">
                        <option>General Inquiry</option>
                        <option>Technical Support</option>
                        <option>Billing</option>
                        <option>Partnership</option>
                        <option>Careers</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Message</label>
                    <textarea 
                      required 
                      rows={5} 
                      placeholder="How can we help you?" 
                      className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-5 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-bold resize-none"
                    ></textarea>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" required className="w-5 h-5 rounded border-slate-200 text-orange-600 focus:ring-orange-500/20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">I agree to the Privacy Policy</span>
                  </label>

                  <button type="submit" className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-black active:scale-95 transition-all shadow-2xl shadow-slate-900/20">
                    Submit Inquiry →
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function ContactInfoItem({ title, content, icon }: { title: string, content: any, icon: string }) {
  return (
    <div className="flex gap-6 group">
      <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center text-2xl group-hover:rotate-6 transition-transform border border-slate-50">{icon}</div>
      <div className="space-y-1">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
        <div className="text-lg font-black text-slate-950 tracking-tight leading-relaxed">{content}</div>
      </div>
    </div>
  )
}

function InputField({ label, placeholder, type = "text", required = false }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</label>
      <input 
        type={type} 
        required={required}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-bold"
      />
    </div>
  )
}
