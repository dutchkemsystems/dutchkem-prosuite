import { useState, useRef, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface AgentWorkflowProps {
  agent: {
    id: string;
    icon: string;
    name: string;
    description: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

type WorkflowStep = 'chat' | 'pay' | 'done';

const PLANS = [
  { id: 'starter', name: 'Starter', price: 1000, duration: '7 days', features: ['1 task', 'Basic support'] },
  { id: 'basic', name: 'Basic', price: 5000, duration: '30 days', features: ['1 task', 'Standard quality', '48hr delivery'] },
  { id: 'standard', name: 'Standard', price: 8000, duration: '30 days', features: ['2-3 tasks', 'Priority support', '24hr delivery'] },
  { id: 'pro', name: 'Pro', price: 15000, duration: '90 days', features: ['5 tasks', 'Priority queue', '12hr delivery', 'Revisions'] },
  { id: 'premium', name: 'Premium', price: 35000, duration: '180 days', features: ['15 tasks', 'VIP support', '6hr delivery', 'Unlimited revisions'] },
  { id: 'enterprise', name: 'Enterprise', price: 100000, duration: '365 days', features: ['Unlimited', 'Dedicated agent', 'Instant delivery', 'Custom outputs'] },
];

const SALES_MESSAGES: Record<string, string[]> = {
  A1: [
    "Hello! 👋 I'm your Academic Writing expert. I can help with thesis, research papers, data analysis, and more.",
    "Many of my clients have successfully completed their PhDs with my assistance. Let me help you too!",
    "Our thesis writing service includes: Literature Review, Methodology, Data Analysis, and Full Formatting.",
  ],
  A2: [
    "Welcome! 💼 I'm your Business Consultant. I can help with strategy, market analysis, and business planning.",
    "I've helped over 500 businesses grow their revenue by 200%+ in the first year.",
    "Let me create a custom business strategy that works for your specific industry.",
  ],
  A3: [
    "Hi! ✍️ I'm your Content Strategist. I create SEO-optimized content that drives traffic and conversions.",
    "From blog posts to social media, I've got you covered with content that ranks.",
    "Let me help you build a content calendar that delivers results!",
  ],
  A4: [
    "Hey! 📄 I'm your Career Coach. I'll help you land your dream job with a standout resume.",
    "My clients have landed roles at Google, Amazon, and top companies worldwide.",
    "Let's build your personal brand and career roadmap!",
  ],
  A5: [
    "Hello! 🛍️ I'm your Personal Shopper. I find the best products at the best prices.",
    "I compare prices across 100+ vendors to save you time and money.",
    "Let me help you make smarter purchase decisions!",
  ],
  A6: [
    "Hi! 📝 I'm your Exam Prep specialist. I create study plans that actually work.",
    "My students have improved their scores by 40% on average.",
    "Let me help you ace your next exam!",
  ],
  A7: [
    "Welcome! 💰 I'm your Finance Advisor. I help you budget, save, and invest wisely.",
    "From tax optimization to investment strategy, I've got you covered.",
    "Let me create a financial plan that works for your goals!",
  ],
  A8: [
    "Hey! 🎬 I'm your MediaStudio expert. I create professional video content and scripts.",
    "From storyboards to final delivery, I handle the entire production process.",
    "Let me bring your vision to life!",
  ],
  A9: [
    "Hello! 🏥 I'm your Wellness Coach. I create personalized health and fitness plans.",
    "From meal plans to workout routines, I help you feel your best.",
    "Let's start your wellness journey today!",
  ],
  A10: [
    "Hi! 🧹 I'm your Home Services expert. I help you maintain and improve your home.",
    "From cleaning schedules to maintenance plans, I've got you covered.",
    "Let me help you create a home that works for you!",
  ],
  A11: [
    "Welcome! 🗣️ I'm your Language Tutor. I make learning languages fun and effective.",
    "From grammar to conversation practice, I'll help you become fluent.",
    "Let's start your language journey!",
  ],
  A12: [
    "Hey! ✈️ I'm your Travel Planner. I create unforgettable trip itineraries.",
    "From budget travel to luxury getaways, I plan it all.",
    "Where do you want to go next?",
  ],
  A13: [
    "Hello! 🚀 I'm your ServiceMart guide. I help you find and book local services.",
    "From plumbers to electricians, I connect you with trusted professionals.",
    "What service do you need?",
  ],
  A14: [
    "Hi! 📝 I'm your Translation expert. I provide accurate, culturally-aware translations.",
    "From documents to websites, I handle 50+ languages.",
    "What do you need translated?",
  ],
  A15: [
    "Welcome! 🎉 I'm your Event Planner. I create memorable events that wow your guests.",
    "From corporate events to weddings, I handle every detail.",
    "What event are you planning?",
  ],
  default: [
    "Hello! 👋 I'm here to help you with your project. Let me understand your needs first.",
    "I have extensive experience in this field and can deliver high-quality results.",
    "Many clients have rated our service 5/5. Let me show you what we can do!",
  ],
};

const AGENT_DELIVERABLES: Record<string, string[]> = {
  A1: ['Research paper', 'Thesis chapter', 'Literature review', 'Methodology analysis', 'APA/MLA formatting', 'Plagiarism report'],
  A2: ['Business plan', 'Market analysis', 'SWOT report', 'Financial projections', 'Pitch deck', 'Competitive analysis'],
  A3: ['SEO blog posts', 'Social content', 'Email campaigns', 'Landing copy', 'Brand guidelines', 'Content calendar'],
  A4: ['Professional resume', 'Cover letter', 'LinkedIn profile', 'Interview prep', 'Career roadmap', 'Skills assessment'],
  A5: ['Product comparison', 'Price analysis', 'Vendor list', 'Purchase guide', 'Budget report', 'Recommendations'],
  A6: ['Study plan', 'Practice tests', 'Exam tips', 'Revision notes', 'Mock exams', 'Score guide'],
  A7: ['Budget plan', 'Investment strategy', 'Tax optimization', 'Savings roadmap', 'Financial report', 'Risk analysis'],
  A8: ['Video script', 'Storyboard', 'Editing guide', 'Thumbnail designs', 'SEO metadata', 'Distribution plan'],
  A9: ['Meal plan', 'Workout routine', 'Wellness guide', 'Progress tracker', 'Health report', 'Lifestyle tips'],
  A10: ['Maintenance schedule', 'Cleaning checklist', 'Home plan', 'Vendor contacts', 'Cost estimates', 'Improvement guide'],
  A11: ['Lesson plan', 'Grammar guide', 'Vocabulary list', 'Practice exercises', 'Pronunciation', 'Progress tracker'],
  A12: ['Travel itinerary', 'Packing list', 'Budget breakdown', 'Local guides', 'Safety tips', 'Booking guide'],
  A13: ['Service directory', 'Vendor comparison', 'Pricing guide', 'Booking schedule', 'Review summary', 'Contacts'],
  A14: ['Translated docs', 'Localization report', 'Glossary', 'Cultural notes', 'QA checklist', 'Style guide'],
  A15: ['Event plan', 'Vendor list', 'Timeline', 'Budget tracker', 'Guest list', 'Venue guide'],
};

export function AgentWorkflow({ agent, isOpen, onClose }: AgentWorkflowProps) {
  const [step, setStep] = useState<WorkflowStep>('chat');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; content: string; timestamp: Date }>>([]);
  const [input, setInput] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const initiatePayment = useAction(api.agent_payments.initiatePayment);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const salesMsgs = SALES_MESSAGES[agent.id] || SALES_MESSAGES.default;
      setMessages([{ role: 'agent', content: salesMsgs[0], timestamp: new Date() }]);
    }
  }, [isOpen, agent.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setStep('chat');
      setSelectedPlan(null);
      setPaymentError(null);
      setMessages([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input, timestamp: new Date() }]);
    setInput('');
    
    const salesMsgs = SALES_MESSAGES[agent.id] || SALES_MESSAGES.default;
    const responseIdx = Math.min(messages.length, salesMsgs.length - 1);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: salesMsgs[responseIdx] || "That's a great question! Let me help you with that. 😊",
        timestamp: new Date() 
      }]);
    }, 800);
  };

  const handleSubscribe = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
    setStep('pay');
    setPaymentError(null);
  };

  const handlePayment = async () => {
    if (!selectedPlan || !customerName || !customerEmail) {
      setPaymentError('Please fill in your details');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const result = await initiatePayment({
        agentId: agent.id,
        agentName: agent.name,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        email: customerEmail,
        name: customerName,
      });

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setPaymentError(result.error || 'Payment failed. Please try again.');
        setIsProcessing(false);
      }
    } catch (error: any) {
      setPaymentError(error.message || 'An error occurred.');
      setIsProcessing(false);
    }
  };

  const deliverables = AGENT_DELIVERABLES[agent.id] || ['Custom deliverables', 'Professional output', 'Quality assured'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-2xl">
              {agent.icon}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{agent.name}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {step === 'chat' ? 'Chat with AI Agent' : step === 'pay' ? 'Complete Payment' : 'Delivered'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-2 bg-slate-800/50 border-b border-slate-800">
          {['chat', 'pay', 'done'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s ? 'bg-indigo-600 text-white' : 
                ['chat', 'pay', 'done'].indexOf(step) > i ? 'bg-emerald-600 text-white' : 
                'bg-slate-700 text-slate-400'
              }`}>
                {['chat', 'pay', 'done'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-bold capitalize ${
                step === s ? 'text-white' : 'text-slate-500'
              }`}>{s === 'done' ? 'complete' : s}</span>
              {i < 2 && <div className="w-6 h-px bg-slate-700"></div>}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* STEP 1: Chat */}
          {step === 'chat' && (
            <div className="flex flex-col h-full">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                      <div className="text-[9px] opacity-50 mt-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-slate-800">
                <div className="flex gap-2 mb-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about services, pricing, turnaround time..."
                    className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button onClick={handleSend} className="px-5 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-colors">
                    Send
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Choose a plan to get started</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {PLANS.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => handleSubscribe(plan)}
                      className="p-2 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500 hover:bg-slate-750 transition-all text-left group"
                    >
                      <div className="font-bold text-white text-[11px] group-hover:text-indigo-400 transition-colors">{plan.name}</div>
                      <div className="text-indigo-400 font-black text-sm">₦{plan.price.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-500">{plan.duration}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Pay */}
          {step === 'pay' && (
            <div className="p-6 max-w-md mx-auto">
              <div className="bg-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-xl">
                    {agent.icon}
                  </div>
                  <div>
                    <div className="font-bold text-white">{agent.name}</div>
                    <div className="text-xs text-slate-400">{selectedPlan?.name} • {selectedPlan?.duration}</div>
                  </div>
                </div>
                <div className="text-2xl font-black text-indigo-400">₦{selectedPlan?.price.toLocaleString()}</div>
              </div>

              {paymentError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                  <p className="text-red-400 text-sm">{paymentError}</p>
                </div>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || !customerName || !customerEmail}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-white hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    `Pay ₦${selectedPlan?.price.toLocaleString()}`
                  )}
                </button>

                <button
                  onClick={() => setStep('chat')}
                  className="w-full py-3 bg-slate-800 rounded-xl text-slate-400 text-sm font-bold hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
                >
                  ← Back to chat
                </button>
              </div>

              <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4">
                Secured by Kora Pay • PCI DSS Compliant
              </p>
            </div>
          )}

          {/* STEP 3: Done */}
          {step === 'done' && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-3xl text-emerald-400 mx-auto mb-4 border border-emerald-500/20">
                ✓
              </div>
              <h3 className="text-xl font-black text-white mb-1">Payment Confirmed!</h3>
              <p className="text-slate-400 text-sm mb-6">Your subscription is active. Your AI agent is ready to work.</p>

              <div className="bg-slate-800 rounded-2xl p-4 mb-6 text-left">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-xl">
                    {agent.icon}
                  </div>
                  <div>
                    <div className="font-bold text-white">{agent.name}</div>
                    <div className="text-xs text-slate-400">{selectedPlan?.name} Plan</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {deliverables.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400">✓</span> {d}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-400 font-bold uppercase mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                AI Agent Active • Quality Verified • Publication Ready
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-white hover:from-orange-600 hover:to-red-600 transition-all"
              >
                Start Using Agent →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
