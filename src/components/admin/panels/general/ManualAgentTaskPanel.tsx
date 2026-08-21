import { useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export function ManualAgentTaskPanel() {
  const [agentId, setAgentId] = useState("A1");
  const [userEmail, setUserEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskOutput, setTaskOutput] = useState<any>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const agents = [
    { id: "A1", name: "Academic Pro", icon: "\uD83C\uDF93" },
    { id: "A2", name: "Business Pro", icon: "\uD83D\uDCBC" },
    { id: "A3", name: "Content Pro", icon: "\u270D\uFE0F" },
    { id: "A4", name: "Career Pro", icon: "\uD83D\uDCC4" },
    { id: "A5", name: "Personal Shopper", icon: "\uD83D\uDECD\uFE0F" },
    { id: "A6", name: "Exam Pro", icon: "\uD83D\uDCDD" },
    { id: "A7", name: "Finance Pro", icon: "\uD83D\uDCB0" },
    { id: "A8", name: "MediaStudio Pro", icon: "\uD83C\uDFAC" },
    { id: "A9", name: "Wellness Pro", icon: "\uD83C\uDFE5" },
    { id: "A10", name: "Home Services", icon: "\uD83E\uDDF9" },
    { id: "A11", name: "Language Tutor", icon: "\uD83D\uDDE3\uFE0F" },
    { id: "A12", name: "Travel Planner", icon: "\u2708\uFE0F" },
    { id: "A13", name: "ServiceMart NG", icon: "\uD83D\uDE80" },
    { id: "A14", name: "Translation Hub", icon: "\uD83D\uDDE3\uFE0F\uD83D\uDCDD" },
    { id: "A15", name: "Event Planner", icon: "\uD83C\uDF89" },
  ];

  const agentServices: Record<string, Array<string>> = {
    A1: ["Thesis Writing", "Research Papers", "Dissertation Support", "Literature Review", "Data Analysis", "Academic Editing", "Citation Formatting", "Plagiarism Check", "Abstract Writing", "Case Study Analysis"],
    A2: ["Business Plan", "Financial Model", "Pitch Deck", "Market Research", "Competitor Analysis", "GTM Strategy", "Revenue Projection", "Investor Memo", "SWOT Analysis", "Business Valuation"],
    A3: ["SEO Blog Posts", "Social Media Content", "Sales Copy", "Email Campaigns", "Website Copy", "Product Descriptions", "Newsletter Content", "Video Scripts", "Ad Copy", "Brand Voice Guide"],
    A4: ["CV/Resume Writing", "LinkedIn Optimization", "Cover Letter", "Interview Prep", "Career Strategy", "ATS Optimization", "Portfolio Review", "Salary Negotiation", "Executive Bio", "Personal Branding"],
    A5: ["Price Comparison", "Product Research", "Deal Finding", "Purchase Recommendations", "Budget Shopping", "Bulk Sourcing", "Vendor Vetting", "Quality Assessment", "Shipping Optimization", "Return Assistance"],
    A6: ["PMP Prep", "CFA Study Guide", "AWS Certification", "GRE Preparation", "GMAT Training", "JAMB/WAEC Prep", "Study Schedule", "Practice Tests", "Concept Reviews", "Exam Strategy"],
    A7: ["Budget Planning", "Savings Strategy", "Investment Advice", "Debt Management", "Tax Planning", "Retirement Planning", "Insurance Review", "Cash Flow Analysis", "Wealth Building", "Financial Literacy"],
    A8: ["Video Editing", "2D Animation", "3D Animation", "Voiceover Recording", "Script Writing", "Storyboard Creation", "Motion Graphics", "Sound Design", "Color Grading", "Film Production"],
    A9: ["Meal Plans", "Workout Routines", "Weight Management", "Nutrition Coaching", "Mental Wellness", "Sleep Optimization", "Stress Management", "Fitness Tracking", "Health Assessments", "Lifestyle Coaching"],
    A10: ["Cleaning Schedules", "Home Organization", "Maintenance Planning", "Decluttering", "Seasonal Cleaning", "Deep Cleaning", "Move-in/Move-out", "Storage Solutions", "Home Inventory", "Service Booking"],
    A11: ["Language Tutoring", "Conversation Practice", "Grammar Lessons", "Vocabulary Building", "Pronunciation Guide", "Cultural Context", "Business Language", "Travel Phrases", "Exam Prep", "Translation Practice"],
    A12: ["Trip Planning", "Itinerary Creation", "Budget Planning", "Hotel Recommendations", "Flight Booking", "Activity Suggestions", "Travel Insurance", "Visa Guidance", "Packing Lists", "Local Guides"],
    A13: ["JAMB Preparation", "WAEC/NECO Prep", "University Applications", "Scholarship Search", "Career Counseling", "Skill Assessment", "Interview Coaching", "Resume Building", "Job Search", "Freelancing Guide"],
    A14: ["Document Translation", "Website Localization", "Business Translation", "Legal Translation", "Medical Translation", "Technical Translation", "Certified Translation", "Multilingual Content", "Localization QA", "Terminology Management"],
    A15: ["Wedding Planning", "Corporate Events", "Birthday Parties", "Conference Planning", "Venue Selection", "Catering Coordination", "Decor Design", "Entertainment Booking", "Budget Management", "Vendor Management"],
  };

  const selectedAgent = agents.find(a => a.id === agentId);
  const currentServices = agentServices[agentId] || [];

  const { data: services } = useSuspenseQuery(convexQuery(api.admin.getAgentServices, { agentId }));
  const { data: logs } = useSuspenseQuery(convexQuery(api.uae_engine.getManualTaskLogs, {})) as { data: any[] };
  const generateTask = useMutation(api.uae_engine.generateAdminManualTask);

  useEffect(() => {
    if (!currentTaskId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_CONVEX_URL.replace('.cloud', '.site')}/api/admin/task-status?taskId=${currentTaskId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "completed" && !cancelled) {
            setTaskOutput({ output: data.output, status: "completed" });
            setIsGenerating(false);
            setCurrentTaskId(null);
          } else if (data.status === "failed" && !cancelled) {
            setTaskOutput({ output: data.output || "Task failed", status: "failed" });
            setIsGenerating(false);
            setCurrentTaskId(null);
          }
        }
      } catch (e) { console.error("Task status poll failed:", e); }
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentTaskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsGenerating(true);
    setTaskOutput(null);
    try {
      const result = await generateTask({ agentId, serviceId: serviceId || "General", prompt, userEmail });
      if (result?.taskId) {
        setCurrentTaskId(result.taskId);
      } else {
        setTaskOutput({ output: result?.error || "Failed to start task", status: "failed" });
        setIsGenerating(false);
      }
    } catch (err: any) {
      setTaskOutput({ output: err.message, status: "failed" });
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px]"></div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-8">Manual Agent Task (Admin Override)</h2>
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Agent</label>
                <select
                  value={agentId}
                  onChange={(e) => { setAgentId(e.target.value); setServiceId(""); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.id} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">User Email (Optional)</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Service / Task</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
              >
                <option value="">— Select a service —</option>
                {currentServices.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Input Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder={`Describe the task for ${selectedAgent?.name || 'Agent'}...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating || !prompt}
              className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50"
            >
              {isGenerating ? "Executing Agent..." : `Generate Task — ${selectedAgent?.name || 'Agent'}`}
            </button>
          </form>

          {isGenerating && (
            <div className="mt-6 p-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center">
              <div className="text-2xl mb-2 animate-pulse">⚡</div>
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest">Generating with {selectedAgent?.name} AI...</p>
              <p className="text-[10px] text-slate-500 mt-1">The real agent is processing your request. This may take 10-30 seconds.</p>
            </div>
          )}
          {taskOutput && (
            <div className="mt-6 p-6 bg-slate-950 border border-white/5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Agent Output — {selectedAgent?.name}</p>
                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${taskOutput.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                  {taskOutput.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {taskOutput.output}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
          <h2 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Admin Task Audit Log</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log: any) => (
              <div key={log._id} className="bg-slate-950 p-6 rounded-3xl border border-white/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tight">{log.agentId} • {log.serviceId}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                    log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    log.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold italic line-clamp-2">"{log.prompt}"</p>
                {log.output && (
                  <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Result Output</p>
                    <p className="text-[10px] text-slate-300 font-medium whitespace-pre-wrap">{log.output}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
