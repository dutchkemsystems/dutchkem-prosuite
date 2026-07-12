import { useState } from 'react';
import { AgentWorkflow } from './AgentWorkflow';

interface Agent {
  id: string;
  icon: string;
  name: string;
  description: string;
  capabilities: string[];
  sampleOutput: string;
  pricing: string;
}

interface AgentEnhancement {
  agentId: string;
  enhanced: boolean;
  toolCount: number;
}

const AGENTS: Agent[] = [
  { id: 'A1', icon: '🎓', name: 'Academic Writer', description: 'AI-powered academic writing, research papers, essays, and citations',
    capabilities: ['Thesis Writing', 'Research Papers', 'Citations', 'Data Analysis', 'Literature Review'],
    sampleOutput: 'I can help you write a comprehensive thesis on renewable energy in Nigeria. I\'ll create a 20-page document with proper citations, methodology, and data analysis. Let me start with an outline...',
    pricing: 'From ₦5,000' },
  { id: 'A2', icon: '💼', name: 'Business Consultant', description: 'Strategic business advice, market analysis, and growth planning',
    capabilities: ['Business Plans', 'Financial Models', 'Pitch Decks', 'Market Research', 'SWOT Analysis'],
    sampleOutput: 'For your logistics business, I\'ll create a 20-page business plan with 3-year financial projections, market analysis, and a compelling pitch deck. Let me start with an executive summary...',
    pricing: 'From ₦10,000' },
  { id: 'A3', icon: '✍️', name: 'Content Strategist', description: 'Content creation, copywriting, blog posts, and marketing copy',
    capabilities: ['Blog Posts', 'Social Media', 'Email Campaigns', 'Sales Copy', 'Content Calendar'],
    sampleOutput: 'I\'ll create a 30-day content calendar for your fashion brand with daily post ideas, hashtags, and engagement strategies. Let me start with your brand voice...',
    pricing: 'From ₦3,000' },
  { id: 'A4', icon: '📄', name: 'Career Coach', description: 'Resume building, interview prep, and career guidance',
    capabilities: ['CV Writing', 'LinkedIn Optimization', 'Interview Prep', 'Job Strategy', 'Cover Letters'],
    sampleOutput: 'I\'ll create an ATS-optimized CV that highlights your tech skills and projects. For fresh graduates, I focus on skills and projects over experience. Let me start...',
    pricing: 'From ₦5,000' },
  { id: 'A5', icon: '🛍️', name: 'Personal Shopper', description: 'Product recommendations, comparisons, and shopping guidance',
    capabilities: ['Price Comparison', 'Deal Finder', 'Product Reviews', 'Budget Shopping', 'Gift Ideas'],
    sampleOutput: 'For phones under ₦200K, here are my top picks: Samsung Galaxy A54 (₦180K) - Best overall. Xiaomi Redmi Note 12 (₦150K) - Best value. Let me compare specs...',
    pricing: 'From ₦2,000' },
  { id: 'A6', icon: '📝', name: 'Exam Prep', description: 'Study plans, practice questions, and exam preparation',
    capabilities: ['JAMB Prep', 'WAEC/NECO', 'PMP Certification', 'Study Plans', 'Practice Tests'],
    sampleOutput: 'For JAMB prep, I recommend a 13-week study plan: Weeks 1-4 syllabus review, 5-8 weak areas, 9-12 practice tests, 13 final revision. Let me create your personalized plan...',
    pricing: 'From ₦3,000' },
  { id: 'A7', icon: '💰', name: 'Finance Advisor', description: 'Financial planning, investment advice, and budget management',
    capabilities: ['Budget Planning', 'Investment Advice', 'Savings Goals', 'Debt Management', 'Retirement'],
    sampleOutput: 'For a ₦200K salary, I recommend: Housing 30%, Food 20%, Transport 15%, Savings 20%, Utilities 10%, Misc 5%. Let me create a personalized budget...',
    pricing: 'From ₦4,000' },
  { id: 'A8', icon: '🎬', name: 'MediaStudio', description: 'Video production, editing guidance, and media creation',
    capabilities: ['Video Editing', '2D/3D Animation', 'Voice Cloning', 'Transcription', 'Media Production'],
    sampleOutput: 'For a restaurant promo, I recommend a 30-second social video (₦25K) with food shots, ambiance, and customer testimonials. Let me create a production plan...',
    pricing: 'From ₦15,000' },
  { id: 'A9', icon: '🏥', name: 'Wellness Coach', description: 'Health tips, fitness plans, and wellness guidance',
    capabilities: ['Meal Plans', 'Workout Programs', 'Weight Loss', 'Sleep Optimization', 'Stress Management'],
    sampleOutput: 'For sustainable weight loss, I recommend: nutrition changes, 30-min daily walks, 2-3L water, 7-8h sleep. Let me create a personalized 30-day plan...',
    pricing: 'From ₦5,000' },
  { id: 'A10', icon: '🧹', name: 'Home Services', description: 'Home maintenance, cleaning tips, and property management',
    capabilities: ['Cleaning Schedules', 'Deep Cleaning', 'Decluttering', 'Maintenance Plans', 'Organization'],
    sampleOutput: 'For deep cleaning, start room-by-room: Kitchen first (bacteria hotspots), then bathroom, living room, bedrooms. Let me create a professional cleaning schedule...',
    pricing: 'From ₦2,000' },
  { id: 'A11', icon: '🗣️', name: 'Language Tutor', description: 'Language learning, grammar help, and conversation practice',
    capabilities: ['French/Spanish', 'Grammar Lessons', 'Pronunciation', 'Vocabulary', 'Conversation Practice'],
    sampleOutput: 'For French basics: Bonjour (Hello), Merci (Thank you), S\'il vous plaît (Please). Let me create a 30-day French crash course for your trip...',
    pricing: 'From ₦2,000' },
  { id: 'A12', icon: '✈️', name: 'Travel Planner', description: 'Trip planning, itinerary creation, and travel recommendations',
    capabilities: ['Itinerary Planning', 'Budget Breakdown', 'Restaurant Guide', 'Activity Suggestions', 'Accommodation'],
    sampleOutput: 'For Zanzibar: Day 1 Stone Town, Day 2 Nungwi Beach, Day 3 Spice Tour, Day 4 Snorkeling. Budget ₦800K for 5 days. Let me create your full itinerary...',
    pricing: 'From ₦5,000' },
  { id: 'A13', icon: '🚀', name: 'ServiceMart NG', description: 'Service marketplace, local business discovery, and bookings',
    capabilities: ['CAC Registration', 'Business Setup', 'JAMB/WAEC Prep', 'Service Discovery', 'Bookings'],
    sampleOutput: 'For CAC registration: Business Name ₦10K, Company ₦50K. Steps: Search availability → Complete forms → Pay fees → Submit docs. Let me guide you...',
    pricing: 'From ₦3,000' },
  { id: 'A14', icon: '📝', name: 'Translation Hub', description: 'Text translation, language localization, and multilingual support',
    capabilities: ['Document Translation', 'Audio Transcription', 'Video Subtitling', 'Certified Translation', 'Localization'],
    sampleOutput: 'For English to Yoruba translation: ₦500 per 500 words, ₦2,000 per page for documents. Turnaround 24-48 hours. Let me quote your document...',
    pricing: 'From ₦500' },
  { id: 'A15', icon: '🎉', name: 'Event Planner', description: 'Event organization, venue selection, and party planning',
    capabilities: ['Wedding Planning', 'Corporate Events', 'Budget Tracking', 'Venue Selection', 'Catering'],
    sampleOutput: 'For your wedding, I\'ll create a complete checklist: Venue → Catering → Music → Photography → Decorations. Budget from ₦500K. Let me start planning...',
    pricing: 'From ₦5,000' },
];

interface AgentBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'modal' | 'page';
  agentEnhancement?: AgentEnhancement[];
}

export function AgentBrowser({ isOpen, onClose, mode, agentEnhancement = [] }: AgentBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);

  const filteredAgents = AGENTS.filter((agent) => {
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.description.toLowerCase().includes(query) ||
      agent.capabilities.some(c => c.toLowerCase().includes(query))
    );
  });

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const getEnhancement = (agentId: string) => {
    return agentEnhancement.find((e) => e.agentId === agentId);
  };

  if (!isOpen) return null;

  const content = (
    <div className={mode === 'page' ? 'p-6' : ''}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Browse Agents</h2>
            <p className="text-slate-400 text-sm mt-1">Select a specialized AI agent to begin your task.</p>
          </div>
          {mode === 'modal' && (
            <button onClick={onClose}
              className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700">
              ✕
            </button>
          )}
        </div>

        {/* Process Steps */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-black text-white mb-3 uppercase tracking-wider">How It Works</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { step: '01', title: 'Choose Agent', desc: 'Select from 15 specialized experts', icon: '🤖' },
              { step: '02', title: 'Brief Your Need', desc: 'Tell us what you need help with', icon: '📝' },
              { step: '03', title: 'AI Execution', desc: 'Our AI generates your deliverable', icon: '⚡' },
              { step: '04', title: 'Download & Scale', desc: 'Get your files and grow', icon: '🚀' },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 text-xs font-black flex-shrink-0">{s.step}</div>
                <div>
                  <p className="text-xs font-bold text-white">{s.title}</p>
                  <p className="text-[10px] text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input type="text" placeholder="Search agents by name, skill, or capability..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">✕</button>
          )}
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const enhancement = getEnhancement(agent.id);
            const isHovered = hoveredAgent?.id === agent.id;
            return (
              <div key={agent.id}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${isHovered ? 'bg-slate-700 border-indigo-500 scale-[1.02]' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                onMouseEnter={() => setHoveredAgent(agent)}
                onMouseLeave={() => setHoveredAgent(null)}
                onClick={() => handleSelectAgent(agent)}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl flex items-center justify-center text-2xl">{agent.icon}</div>
                    <div>
                      <p className="font-bold text-sm text-white">{agent.name}</p>
                      <p className="text-[10px] text-slate-500">{agent.id}</p>
                    </div>
                  </div>
                  {enhancement?.enhanced && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">⚡ Enhanced</span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">{agent.description}</p>

                {/* Capability Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.capabilities.slice(0, 3).map((cap) => (
                    <span key={cap} className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-[9px] font-bold">{cap}</span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="px-2 py-0.5 bg-slate-700 text-slate-500 rounded text-[9px]">+{agent.capabilities.length - 3}</span>
                  )}
                </div>

                {/* Preview (shown on hover) */}
                {isHovered && (
                  <div className="bg-slate-900/80 rounded-xl p-3 mb-3 border border-slate-600">
                    <p className="text-[10px] text-slate-300 italic line-clamp-3">{agent.sampleOutput}</p>
                    <p className="text-[9px] text-orange-400 font-bold mt-2">{agent.pricing}</p>
                  </div>
                )}

                {/* CTA */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Start Chat →</span>
                  {enhancement?.enhanced && (
                    <span className="text-[9px] text-emerald-400">{enhancement.toolCount} tools</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-lg">No agents found matching "{searchQuery}"</p>
            <button onClick={() => setSearchQuery('')} className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm">Clear search</button>
          </div>
        )}
      </div>
    </div>
  );

  if (mode === 'modal') {
    if (selectedAgent) {
      return <AgentWorkflow agent={selectedAgent} isOpen={true} onClose={() => setSelectedAgent(null)} />;
    }
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
          {content}
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      {selectedAgent && <AgentWorkflow agent={selectedAgent} isOpen={true} onClose={() => setSelectedAgent(null)} />}
    </>
  );
}
