import { useState } from "react";
import { AgentBrowser } from "./dashboard/AgentBrowser";
import { CreditPackages } from "./dashboard/CreditPackages";

interface AgentEnhancement {
  agentId: string;
  enhanced: boolean;
  toolCount: number;
}

interface ClientQuickActionsProps {
  agentEnhancement?: AgentEnhancement[];
}

export function ClientQuickActions({ agentEnhancement = [] }: ClientQuickActionsProps) {
  const [showAgentBrowser, setShowAgentBrowser] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const actions = [
    {
      id: "new-project",
      name: "New Project",
      description: "Start a new project with any of our 15 specialized AI agents",
      icon: "➕",
      category: "Actions",
      highlight: true,
      onClick: () => setShowAgentBrowser(true),
    },
    {
      id: "browse-agents",
      name: "Browse All Agents",
      description: "Explore and chat with any of our 15 specialized AI agents",
      icon: "🤖",
      category: "Actions",
      onClick: () => setShowAgentBrowser(true),
    },
    {
      id: "buy-credits",
      name: "Buy Credits",
      description: "Add funds to your wallet for agent services",
      icon: "💰",
      category: "Actions",
      onClick: () => setShowCredits(true),
    },
    {
      id: "academic",
      name: "Academic Writer",
      description: "AI-powered academic writing, research papers, and citations",
      icon: "🎓",
      category: "Agents",
      onClick: () => setShowAgentBrowser(true),
    },
    {
      id: "business",
      name: "Business Consultant",
      description: "Strategic business advice, market analysis, and growth planning",
      icon: "💼",
      category: "Agents",
      onClick: () => setShowAgentBrowser(true),
    },
    {
      id: "content",
      name: "Content Strategist",
      description: "Content creation, copywriting, blog posts, and marketing copy",
      icon: "✍️",
      category: "Agents",
      onClick: () => setShowAgentBrowser(true),
    },
    {
      id: "career",
      name: "Career Coach",
      description: "Resume building, interview prep, and career guidance",
      icon: "📄",
      category: "Agents",
      onClick: () => setShowAgentBrowser(true),
    },
    {
      id: "finance",
      name: "Finance Advisor",
      description: "Financial planning, investment advice, and budget management",
      icon: "💰",
      category: "Agents",
      onClick: () => setShowAgentBrowser(true),
    },
    {
      id: "video",
      name: "MediaStudio",
      description: "Video production, editing guidance, and media creation",
      icon: "🎬",
      category: "Agents",
      onClick: () => setShowAgentBrowser(true),
    },
    {
      id: "wellness",
      name: "Wellness Coach",
      description: "Health tips, fitness plans, and wellness guidance",
      icon: "🏥",
      category: "Agents",
      onClick: () => setShowAgentBrowser(true),
    },
  ];

  const categories = [...new Set(actions.map((a) => a.category))];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-white uppercase tracking-tight">Quick Actions</h3>
        <span className="text-[9px] text-purple-500 font-bold uppercase">Start Tasks</span>
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-6 last:mb-0">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">{category}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.filter((a) => a.category === category).map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`p-4 rounded-2xl border transition-all text-left group ${
                  action.highlight
                    ? "bg-indigo-600 border-indigo-500 hover:bg-indigo-500"
                    : "bg-slate-950 border-white/5 hover:border-purple-500/30"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{action.icon}</span>
                  <div>
                    <p className={`text-xs font-bold transition-colors ${
                      action.highlight ? "text-white" : "text-white group-hover:text-purple-400"
                    }`}>
                      {action.name}
                    </p>
                  </div>
                </div>
                <p className={`text-[10px] ${action.highlight ? "text-indigo-200" : "text-slate-400"}`}>{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      ))}

      <AgentBrowser isOpen={showAgentBrowser} onClose={() => setShowAgentBrowser(false)} mode="modal" agentEnhancement={agentEnhancement} />
      <CreditPackages isOpen={showCredits} onClose={() => setShowCredits(false)} />
    </div>
  );
}
