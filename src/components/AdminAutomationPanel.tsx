import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

// Feature 1: AI Chatbot Panel
function ChatbotPanel() {
  const [selectedTab, setSelectedTab] = useState<"active" | "logs" | "settings">("active");
  const chats = useSuspenseQuery(convexQuery(api.chatbot.getActiveChats, {})) as any;
  const resolveChat = useConvexMutation(api.chatbot.resolveChat);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {(["active", "logs", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTab === tab
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {tab === "active" ? "Active Chats" : tab === "logs" ? "Chat Logs" : "Settings"}
          </button>
        ))}
      </div>

      {selectedTab === "active" && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white">Escalated Chats ({chats.data?.length || 0})</h4>
          {chats.data?.length === 0 ? (
            <p className="text-slate-400">No active escalated chats</p>
          ) : (
            <div className="space-y-2">
              {chats.data?.map((chat: any) => (
                <div key={chat._id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-medium text-slate-300">{chat.agentType}</span>
                      <span className="ml-2 text-xs text-slate-500">{chat.sessionId}</span>
                    </div>
                    <button
                      onClick={() => resolveChat({ chatId: chat._id })}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTab === "logs" && (
        <div className="text-slate-400">Chat logs viewer coming soon...</div>
      )}

      {selectedTab === "settings" && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-300">Escalation Settings</h4>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <label className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Auto-escalate when AI confidence below:</span>
              <select className="bg-slate-700 text-white rounded px-2 py-1 text-sm">
                <option value={50}>50%</option>
                <option value={60}>60%</option>
                <option value={70} selected>70%</option>
                <option value={80}>80%</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// Feature 2: Lead Scoring Panel
function LeadScoringPanel() {
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month" | "all">("all");
  const leads = useSuspenseQuery(convexQuery(api.lead_scoring.getTopLeads, { limit: 20 })) as any;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-white">Lead Scoring</h4>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as any)}
          className="bg-slate-700 text-white rounded px-3 py-1 text-sm"
        >
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="space-y-2">
        {leads.data?.map((lead: any, _idx: any) => (
          <div key={lead.userId} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="#334155" strokeWidth="4" fill="none" />
                  <circle
                    cx="24" cy="24" r="20"
                    stroke={lead.score >= 70 ? "#22c55e" : lead.score >= 40 ? "#eab308" : "#ef4444"}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${(lead.score / 100) * 125.6} 125.6`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {lead.score}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{lead.userName || "Unknown"}</p>
                <p className="text-xs text-slate-400">{lead.userEmail || "No email"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Next Action</p>
                <p className="text-xs text-blue-400 max-w-[150px] truncate">{lead.nextBestAction}</p>
              </div>
            </div>
          </div>
        ))}
        {leads.data?.length === 0 && (
          <p className="text-slate-400">No leads scored yet. Run the scoring cron to calculate.</p>
        )}
      </div>
    </div>
  );
}

// Feature 3: Workflows Panel
function WorkflowsPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const workflows = useSuspenseQuery(convexQuery(api.workflows.getWorkflows, {})) as any;
  const toggleWorkflow = useConvexMutation(api.workflows.updateWorkflow);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-white">Automation Workflows</h4>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
        >
          + Create Workflow
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-800 rounded-lg p-4 border border-blue-500">
          <h5 className="text-sm font-medium text-white mb-3">Create New Workflow</h5>
          <p className="text-xs text-slate-400">Workflow builder coming soon. Use Convex functions directly.</p>
        </div>
      )}

      <div className="space-y-2">
        {workflows.data?.map((workflow: any) => (
          <div key={workflow._id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{workflow.name}</p>
                <p className="text-xs text-slate-400">
                  Trigger: {workflow.trigger.type} | Actions: {workflow.actions.length}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Ran {workflow.triggerCount}x</span>
                <button
                  onClick={() => toggleWorkflow({ workflowId: workflow._id, isActive: !workflow.isActive })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    workflow.isActive ? "bg-green-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      workflow.isActive ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
        {workflows.data?.length === 0 && (
          <p className="text-slate-400">No workflows created yet.</p>
        )}
      </div>
    </div>
  );
}

// Feature 4: Leaderboard Panel
function LeaderboardPanel() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "all_time">("weekly");
  const leaderboard = useSuspenseQuery(convexQuery(api.leaderboard.getLeaderboard, { period, limit: 10 })) as any;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-white">Agent Leaderboard</h4>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Recalculate Now
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(["daily", "weekly", "monthly", "all_time"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-xs rounded-lg ${
              period === p ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
            }`}
          >
            {p.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {leaderboard.data?.slice(0, 3).map((entry: any, idx: any) => (
          <div
            key={entry._id}
            className={`flex items-center gap-4 bg-slate-800 rounded-lg p-4 border ${
              idx === 0 ? "border-yellow-500" : idx === 1 ? "border-slate-400" : "border-orange-700"
            }`}
          >
            <span className="text-2xl">
              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{entry.userName || "Agent"}</p>
              <p className="text-xs text-slate-400">Score: {entry.score}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Sales: {entry.metrics?.sales || 0}</p>
              <p>Completions: {entry.metrics?.completions || 0}</p>
            </div>
          </div>
        ))}
        {leaderboard.data?.length === 0 && (
          <p className="text-slate-400">No leaderboard data yet. Run recalculate to generate.</p>
        )}
      </div>
    </div>
  );
}

// Feature 5: Communication Hub Panel
function CommunicationPanel() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState<"sms" | "whatsapp" | "call">("sms");
  const stats = useSuspenseQuery(convexQuery(api.communication.getCommunicationStats, {})) as any;
  const sendSms = useConvexMutation(api.communication.sendSms);

  const handleSend = () => {
    if (!phone || !message) return;
    if (method === "sms") {
      sendSms({ to: phone, message });
    }
    // WhatsApp and Call would be similar
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-white">1-Click Communication Hub</h4>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.data?.totalSms || 0}</p>
          <p className="text-xs text-slate-400">SMS</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.data?.totalCalls || 0}</p>
          <p className="text-xs text-slate-400">Calls</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.data?.totalWhatsApp || 0}</p>
          <p className="text-xs text-slate-400">WhatsApp</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
        <div className="flex gap-2">
          {(["sms", "whatsapp", "call"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-3 py-1 text-xs rounded-lg ${
                method === m ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              {m === "sms" ? "📱 SMS" : m === "whatsapp" ? "💬 WhatsApp" : "📞 Call"}
            </button>
          ))}
        </div>
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm h-20"
        />
        <button
          onClick={handleSend}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          Send {method.toUpperCase()}
        </button>
      </div>
    </div>
  );
}

// Feature 6: Facebook Leads Panel
function FacebookLeadsPanel() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const leads = useSuspenseQuery(convexQuery(api.facebook_leads.getLeads, { status: statusFilter as any })) as any;
  const updateStatus = useConvexMutation(api.facebook_leads.updateLeadStatus);
  const stats = useSuspenseQuery(convexQuery(api.facebook_leads.getLeadStats, {})) as any;

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-white">Facebook Lead Ads</h4>

      <div className="grid grid-cols-5 gap-3">
        {(["total", "new", "contacted", "qualified", "converted"] as const).map((s) => (
          <div key={s} className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
            <p className="text-xl font-bold text-white">{(stats.data)?.[s] || 0}</p>
            <p className="text-xs text-slate-400 capitalize">{s}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        {(["new", "contacted", "qualified", "converted", "lost"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs rounded-lg capitalize ${
              statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {leads.data?.map((lead: any) => (
          <div key={lead._id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-white">{lead.name || "Unknown"}</p>
                <p className="text-xs text-slate-400">{lead.email || lead.phone || "No contact"}</p>
              </div>
              <select
                value={lead.status}
                onChange={(e) => updateStatus({ leadId: lead._id, status: e.target.value as any })}
                className="bg-slate-700 text-white text-xs rounded px-2 py-1"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <p className="text-xs text-slate-500 mt-1">From: {lead.source} | Received: {new Date(lead.receivedAt).toLocaleDateString()}</p>
          </div>
        ))}
        {leads.data?.length === 0 && (
          <p className="text-slate-400">No leads found.</p>
        )}
      </div>
    </div>
  );
}

// Feature 7: Report Builder Panel
function ReportBuilderPanel() {
  const [reportName, setReportName] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const reports = useSuspenseQuery(convexQuery(api.reports.getReports, {})) as any;
  const triggerGenerateReport = useAction(api.reports.triggerGenerateReport);

  const metricTypes = ["revenue", "subscriptions", "agent_usage", "users", "performance"] as const;

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-white">Custom Report Builder</h4>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
        <input
          type="text"
          placeholder="Report name"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
        />
        <div>
          <p className="text-xs text-slate-400 mb-2">Select Metrics:</p>
          <div className="flex flex-wrap gap-2">
            {metricTypes.map((m) => (
              <label key={m} className="flex items-center gap-1 bg-slate-700 px-2 py-1 rounded text-xs text-slate-300">
                <input type="checkbox" className="rounded" />
                {m.replace("_", " ")}
              </label>
            ))}
          </div>
        </div>
        <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
          Create Report Template
        </button>
      </div>

      <div>
        <h5 className="text-sm font-medium text-slate-300 mb-2">Saved Reports</h5>
        <div className="space-y-2">
          {reports.data?.map((report: any) => (
            <div key={report._id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-sm text-white">{report.name}</p>
                <p className="text-xs text-slate-400">
                  {report.schedule ? `Scheduled: ${report.schedule.frequency}` : "Manual"}
                </p>
              </div>
              <button
                onClick={async () => {
                  setGenerating(report._id);
                  try {
                    await triggerGenerateReport({ reportId: report._id });
                  } catch (e) {
                    console.error("Report generation failed:", e);
                  }
                  setGenerating(null);
                }}
                disabled={generating === report._id}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50"
              >
                {generating === report._id ? "Generating..." : "Generate"}
              </button>
            </div>
          ))}
          {reports.data?.length === 0 && (
            <p className="text-slate-400 text-sm">No saved reports.</p>
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h5 className="text-sm font-medium text-white mb-2">Power BI Integration</h5>
        <input
          type="text"
          placeholder="Paste Power BI Embed URL"
          className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm mb-2"
        />
        <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
          Embed Dashboard
        </button>
      </div>
    </div>
  );
}

// Feature 8: Agent Performance Panel
function AgentPerformancePanel() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const agents = useSuspenseQuery(convexQuery(api.agent_performance.getAllAgentPerformance, { period })) as any;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-white">Agent Performance</h4>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="bg-slate-700 text-white rounded px-3 py-1 text-sm"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div className="space-y-2">
        {agents.data?.map((agent: any) => (
          <div key={agent.userId} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-white">{agent.userName || "Agent"}</p>
                <p className="text-xs text-slate-400">
                  Target Progress: {((agent.metrics.totalRevenue / Math.max(agent.target.revenueTarget, 1)) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-400">
                  ${agent.metrics.totalRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">Revenue</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-700 rounded p-2 text-center">
                <p className="text-slate-400">Sales</p>
                <p className="text-white font-medium">{agent.metrics.totalSales}</p>
              </div>
              <div className="bg-slate-700 rounded p-2 text-center">
                <p className="text-slate-400">Completions</p>
                <p className="text-white font-medium">{agent.metrics.completions}</p>
              </div>
              <div className="bg-slate-700 rounded p-2 text-center">
                <p className="text-slate-400">Rating</p>
                <p className="text-white font-medium">{agent.metrics.averageRating.toFixed(1)}</p>
              </div>
              <div className="bg-slate-700 rounded p-2 text-center">
                <p className="text-slate-400">Commission</p>
                <p className="text-green-400 font-medium">${agent.commission.totalCommission.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
        {agents.data?.length === 0 && (
          <p className="text-slate-400">No performance data yet.</p>
        )}
      </div>
    </div>
  );
}

// Feature 9: Geo-Tracking Panel
function GeoTrackingPanel() {
  const _locations = useSuspenseQuery(convexQuery(api.geo_tracking.getAllClientLocations, {})) as any;
  const stats = useSuspenseQuery(convexQuery(api.geo_tracking.getLocationStats, {})) as any;

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-white">Geo-Tracking & Territory</h4>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.data?.totalTracked || 0}</p>
          <p className="text-xs text-slate-400">Tracked Users</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-green-400">
            {Object.keys(stats.data?.byCountry || {}).length}
          </p>
          <p className="text-xs text-slate-400">Countries</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-purple-400">
            {Object.keys(stats.data?.byCity || {}).length}
          </p>
          <p className="text-xs text-slate-400">Cities</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h5 className="text-sm font-medium text-white mb-2">Top Countries</h5>
        <div className="space-y-1">
          {Object.entries(stats.data?.byCountry || {}).slice(0, 5).map(([country, count]) => (
            <div key={country} className="flex justify-between text-sm">
              <span className="text-slate-300">{country}</span>
              <span className="text-slate-500">{count as number} users</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h5 className="text-sm font-medium text-white mb-2">Map View</h5>
        <div className="bg-slate-700 rounded h-40 flex items-center justify-center text-slate-400 text-sm">
          Map placeholder - Integrate Mapbox/Leaflet here
        </div>
      </div>
    </div>
  );
}

// Feature 10: CRM Hygiene Panel
function CRMHygienePanel() {
  const [_showScan, setShowScan] = useState(false);
  const summary = useSuspenseQuery(convexQuery(api.crm_hygiene.getHygieneSummary, {})) as any;
  const reports = useSuspenseQuery(convexQuery(api.crm_hygiene.getHygieneReports, { limit: 10 })) as any;
  const runScan = useAction(api.crm_hygiene.triggerHygieneScan as any);
  const resolveIssue = useConvexMutation(api.crm_hygiene.resolveHygieneIssue as any);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-white">CRM Data Quality</h4>
        <button
          onClick={() => { setShowScan(true); runScan({}); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
        >
          Run Scan Now
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className={`bg-slate-800 rounded-lg p-3 border ${summary.data?.score && summary.data.score >= 80 ? "border-green-500" : "border-red-500"}`}>
          <p className="text-2xl font-bold text-white">{summary.data?.score || 0}</p>
          <p className="text-xs text-slate-400">Health Score</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-red-400">{summary.data?.highSeverity || 0}</p>
          <p className="text-xs text-slate-400">High Issues</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-yellow-400">{summary.data?.mediumSeverity || 0}</p>
          <p className="text-xs text-slate-400">Medium Issues</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <p className="text-2xl font-bold text-green-400">{summary.data?.resolved || 0}</p>
          <p className="text-xs text-slate-400">Resolved</p>
        </div>
      </div>

      <div className="space-y-2">
        {reports.data?.map((report: any) => (
          <div key={report._id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  report.severity === "high" ? "bg-red-900 text-red-300" :
                  report.severity === "medium" ? "bg-yellow-900 text-yellow-300" :
                  "bg-slate-700 text-slate-300"
                }`}>
                  {report.type.replace("_", " ")}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  {report.affectedUsers.length} users affected | {new Date(report.reportDate).toLocaleDateString()}
                </p>
              </div>
              {!report.resolvedAt && (
                <button
                  onClick={() => resolveIssue({ reportId: report._id, actionTaken: "Reviewed and addressed" })}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
        {reports.data?.length === 0 && (
          <p className="text-slate-400">No hygiene reports. Run a scan to check data quality.</p>
        )}
      </div>
    </div>
  );
}

// Main Admin Automation Panel
export function AdminAutomationPanel() {
  const [activeFeature, setActiveFeature] = useState<string>("chatbot");

  const features = [
    { id: "chatbot", label: "AI Chatbot", icon: "💬" },
    { id: "leads", label: "Lead Scoring", icon: "🎯" },
    { id: "workflows", label: "Workflows", icon: "⚙️" },
    { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
    { id: "communication", label: "Communication", icon: "📞" },
    { id: "facebook", label: "Facebook Leads", icon: "📘" },
    { id: "reports", label: "Reports", icon: "📊" },
    { id: "performance", label: "Agent Perf", icon: "📈" },
    { id: "geo", label: "Geo-Tracking", icon: "🗺️" },
    { id: "hygiene", label: "CRM Hygiene", icon: "🧹" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white">Automation Center</h3>
      
      <div className="flex gap-2 overflow-x-auto pb-2">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => setActiveFeature(feature.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeFeature === feature.id
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            <span className="mr-1">{feature.icon}</span>
            {feature.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        {activeFeature === "chatbot" && <ChatbotPanel />}
        {activeFeature === "leads" && <LeadScoringPanel />}
        {activeFeature === "workflows" && <WorkflowsPanel />}
        {activeFeature === "leaderboard" && <LeaderboardPanel />}
        {activeFeature === "communication" && <CommunicationPanel />}
        {activeFeature === "facebook" && <FacebookLeadsPanel />}
        {activeFeature === "reports" && <ReportBuilderPanel />}
        {activeFeature === "performance" && <AgentPerformancePanel />}
        {activeFeature === "geo" && <GeoTrackingPanel />}
        {activeFeature === "hygiene" && <CRMHygienePanel />}
      </div>
    </div>
  );
}

export default AdminAutomationPanel;