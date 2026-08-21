import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { platformNames } from "./shared";

export function AdEnginePanel() {
  const { data: engineStatus } = useSuspenseQuery(convexQuery(api.adEngine.getAdEngineStatus, {})) as { data: any };
  const { data: campaigns } = useSuspenseQuery(convexQuery(api.adEngine.getCampaigns, {})) as { data: any };
  const { data: analytics } = useSuspenseQuery(convexQuery(api.adEngine.getAdAnalytics, {})) as { data: any };

  const adAdminToken = typeof window !== "undefined" ? localStorage.getItem("admin_session_token") || "" : "";

  const toggleEngine = useMutation(api.adEngine.toggleAdEngine);
  const toggleAutoPost = useMutation(api.adEngine.toggleAutoPost);
  const createCampaign = useMutation(api.adEngine.createCampaign);
  const deleteCampaign = useMutation(api.adEngine.deleteCampaign);
  const generateFlyer = useAction(api.adEngine.generateFlyer);
  const executeAdPost = useAction(api.adEngine.executeAdPost);
  const createAd = useMutation(api.adEngine.createAd);

  const [status, setStatus] = useState<{ message: string; type: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    platform: "x",
    budget: 0,
    dailyBudget: 0,
    goals: "",
  });
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [adContent, setAdContent] = useState("");
  const [flyerPrompt, setFlyerPrompt] = useState("");

  const handleToggleEngine = async (enabled: boolean) => {
    try {
      await toggleEngine({ enabled, adminToken: adAdminToken });
      setStatus({ message: `Ad engine ${enabled ? "enabled" : "disabled"}`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to toggle engine", type: "error" });
    }
  };

  const handleToggleAutoPost = async (enabled: boolean) => {
    try {
      await toggleAutoPost({ enabled, adminToken: adAdminToken });
      setStatus({ message: `Auto-posting ${enabled ? "enabled" : "disabled"}`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to toggle auto-post", type: "error" });
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) {
      setStatus({ message: "Campaign name is required", type: "error" });
      return;
    }
    try {
      await createCampaign({
        name: newCampaign.name,
        description: newCampaign.description || undefined,
        platform: newCampaign.platform,
        budget: newCampaign.budget || undefined,
        dailyBudget: newCampaign.dailyBudget || undefined,
        startDate: Date.now(),
        goals: newCampaign.goals || undefined,
        adminToken: adAdminToken,
      });
      setStatus({ message: `Campaign created successfully`, type: "success" });
      setShowCreateForm(false);
      setNewCampaign({ name: "", description: "", platform: "x", budget: 0, dailyBudget: 0, goals: "" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to create campaign", type: "error" });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Delete this campaign and all its ads?")) return;
    try {
      await deleteCampaign({ campaignId: campaignId as any, adminToken: adAdminToken });
      setStatus({ message: "Campaign deleted", type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to delete", type: "error" });
    }
  };

  const handleGenerateFlyer = async () => {
    if (!flyerPrompt.trim()) {
      setStatus({ message: "Flyer prompt is required", type: "error" });
      return;
    }
    try {
      const result: any = await generateFlyer({ prompt: flyerPrompt, adminToken: adAdminToken });
      setAdContent(`${result.headline}\n\n${result.body}\n\n${result.cta}`);
      setStatus({ message: `Flyer generated: "${result.headline}"`, type: "success" });
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to generate flyer", type: "error" });
    }
  };

  const handlePostAd = async (campaignId: string, platform: string) => {
    if (!adContent.trim()) {
      setStatus({ message: "Ad content is required", type: "error" });
      return;
    }
    try {
      const adResult: any = await createAd({
        campaignId: campaignId as any,
        title: `${platform} ad - ${new Date().toLocaleDateString()}`,
        content: adContent,
        adminToken: adAdminToken,
      });
      if (adResult?.adId) {
        const result: any = await executeAdPost({ adId: adResult.adId, adminToken: adAdminToken });
        if (result.success) {
          setStatus({ message: `✅ Posted to ${platform} successfully`, type: "success" });
          setAdContent("");
        } else {
          setStatus({ message: `Failed: ${result.error}`, type: "error" });
        }
      }
    } catch (err: any) {
      setStatus({ message: err?.message || "Failed to post ad", type: "error" });
    }
  };

  return (
    <div className="space-y-6  duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">📢 Ad Engine</h2>
          <p className="text-slate-400 text-sm mt-1">AI-powered ad campaigns using your connected social accounts</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleToggleEngine(!engineStatus?.enabled)}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              engineStatus?.enabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-600"
            } text-white`}>
            {engineStatus?.enabled ? "Engine ON" : "Engine OFF"}
          </button>
          <button onClick={() => handleToggleAutoPost(!engineStatus?.autoPost)} disabled={!engineStatus?.enabled}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              engineStatus?.autoPost ? "bg-cyan-600 hover:bg-cyan-700" : "bg-slate-700 hover:bg-slate-600"
            } text-white disabled:opacity-50`}>
            {engineStatus?.autoPost ? "Auto-Post ON" : "Auto-Post OFF"}
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-3 rounded-xl ${status.type === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"} text-sm font-medium`}>
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total Ads</p>
          <p className="text-3xl font-black text-white mt-1">{analytics?.totalAds || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/40 border border-emerald-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Posted</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{analytics?.postedAds || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/40 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Impressions</p>
          <p className="text-3xl font-black text-amber-400 mt-1">{(analytics?.totalImpressions || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-900/40 to-slate-900/40 border border-pink-500/30 rounded-2xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">CTR</p>
          <p className="text-3xl font-black text-pink-400 mt-1">{analytics?.ctr || "0.00"}%</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Campaigns</h3>
          <button onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider">
            {showCreateForm ? "Cancel" : "+ New Campaign"}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-4 mb-4 space-y-3">
            <input type="text" placeholder="Campaign name" value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" />
            <textarea placeholder="Description (optional)" value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" rows={2} />
            <select value={newCampaign.platform} onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm">
              {Object.entries(platformNames).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <input type="text" placeholder="Goals (optional)" value={newCampaign.goals}
              onChange={(e) => setNewCampaign({ ...newCampaign, goals: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Total budget" value={newCampaign.budget || ""}
                onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" />
              <input type="number" placeholder="Daily budget" value={newCampaign.dailyBudget || ""}
                onChange={(e) => setNewCampaign({ ...newCampaign, dailyBudget: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" />
            </div>
            <button onClick={handleCreateCampaign} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm">Create Campaign</button>
          </div>
        )}

        <div className="space-y-2">
          {!campaigns || campaigns.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No campaigns yet. Create one to get started.</p>
          ) : (
            campaigns.map((c: any) => (
              <div key={c._id} className={`bg-slate-950/50 border rounded-xl p-4 ${selectedCampaign === c._id ? "border-orange-500" : "border-slate-800"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-bold">{c.name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">{platformNames[c.platform] || c.platform}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                        c.status === "paused" ? "bg-amber-500/20 text-amber-400" :
                        c.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                        "bg-slate-700 text-slate-300"
                      }`}>{c.status}</span>
                    </div>
                    {c.description && <p className="text-xs text-slate-400 mt-1">{c.description}</p>}
                    {c.goals && <p className="text-xs text-slate-500 mt-1">Goal: {c.goals}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedCampaign(selectedCampaign === c._id ? null : c._id)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold">
                      {selectedCampaign === c._id ? "Hide" : "Post Ad"}
                    </button>
                    <button onClick={() => handleDeleteCampaign(c._id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-bold">Delete</button>
                  </div>
                </div>

                {selectedCampaign === c._id && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Flyer Prompt</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Describe your ad (e.g. '50% off Finance Agent this week')"
                          value={flyerPrompt} onChange={(e) => setFlyerPrompt(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" />
                        <button onClick={handleGenerateFlyer}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs uppercase">🤖 Generate</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Ad Content</label>
                      <textarea placeholder="Write or generate your ad content..." value={adContent}
                        onChange={(e) => setAdContent(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" rows={3} />
                    </div>
                    <button onClick={() => handlePostAd(c._id, c.platform)} disabled={!adContent.trim()}
                      className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm">
                      📤 Post to {platformNames[c.platform] || c.platform}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
