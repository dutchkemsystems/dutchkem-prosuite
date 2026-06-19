import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

interface Agent {
  id: string;
  icon: string;
  name: string;
  description: string;
  path: string;
}

const AGENTS: Agent[] = [
  { id: 'A1', icon: '🎓', name: 'Academic Writer', description: 'AI-powered academic writing, research papers, essays, and citations', path: '/academic-writer' },
  { id: 'A2', icon: '💼', name: 'Business Consultant', description: 'Strategic business advice, market analysis, and growth planning', path: '/business-consultant' },
  { id: 'A3', icon: '✍️', name: 'Content Strategist', description: 'Content creation, copywriting, blog posts, and marketing copy', path: '/content-writer' },
  { id: 'A4', icon: '📄', name: 'Career Coach', description: 'Resume building, interview prep, and career guidance', path: '/career-coach' },
  { id: 'A5', icon: '🛍️', name: 'Personal Shopper', description: 'Product recommendations, comparisons, and shopping guidance', path: '/personal-shopper' },
  { id: 'A6', icon: '📝', name: 'Exam Prep', description: 'Study plans, practice questions, and exam preparation', path: '/exam-prep' },
  { id: 'A7', icon: '💰', name: 'Finance Advisor', description: 'Financial planning, investment advice, and budget management', path: '/finance-advisor' },
  { id: 'A8', icon: '🎬', name: 'MediaStudio', description: 'Video production, editing guidance, and media creation', path: '/video-production' },
  { id: 'A9', icon: '🏥', name: 'Wellness Coach', description: 'Health tips, fitness plans, and wellness guidance', path: '/wellness-coach' },
  { id: 'A10', icon: '🧹', name: 'Home Services', description: 'Home maintenance, cleaning tips, and property management', path: '/home-management' },
  { id: 'A11', icon: '🗣️', name: 'Language Tutor', description: 'Language learning, grammar help, and conversation practice', path: '/language-coach' },
  { id: 'A12', icon: '✈️', name: 'Travel Planner', description: 'Trip planning, itinerary creation, and travel recommendations', path: '/travel-planner' },
  { id: 'A13', icon: '🚀', name: 'ServiceMart NG', description: 'Service marketplace, local business discovery, and bookings', path: '/exam-success' },
  { id: 'A14', icon: '📝', name: 'Translation Hub', description: 'Text translation, language localization, and multilingual support', path: '/translation-hub' },
  { id: 'A15', icon: '🎉', name: 'Event Planner', description: 'Event organization, venue selection, and party planning', path: '/event-planner' },
];

interface AgentBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'modal' | 'page';
}

export function AgentBrowser({ isOpen, onClose, mode }: AgentBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredAgents = AGENTS.filter((agent) => {
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.description.toLowerCase().includes(query)
    );
  });

  const handleSelectAgent = (path: string) => {
    navigate({ to: path });
    if (mode === 'modal') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className={mode === 'page' ? 'p-6' : ''}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Browse Agents</h2>
            <p className="text-slate-400 text-sm mt-1">Select a specialized AI agent to begin your task.</p>
          </div>
          {mode === 'modal' && (
            <button
              onClick={onClose}
              className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search agents by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleSelectAgent(agent.path)}
              className="p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all text-left group"
            >
              <div className="text-2xl mb-2">{agent.icon}</div>
              <div className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">{agent.name}</div>
              <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{agent.description}</div>
            </button>
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-lg">No agents found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
